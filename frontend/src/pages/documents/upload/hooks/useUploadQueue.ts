/**
 * useUploadQueue — FSM-based upload queue processor
 *
 * Key design decisions:
 *
 * 1. CONCURRENCY: Uses a Set<id> ref (not a boolean) to track in-flight uploads.
 *    This avoids the timing bug where processingRef = false is set too late
 *    after Zustand state changes already re-fired the effect and bailed early.
 *    Up to MAX_CONCURRENT files upload in parallel.
 *
 * 2. DUPLICATE POLICY:
 *    - exact_duplicate → auto-skip silently (same file already in library)
 *    - same_content    → auto-skip silently (content already exists)
 *    - same_filename   → prompt user (different content with same name — ambiguous)
 *
 * 3. AUTO-CLEAR: Successful and skipped items disappear from the queue after
 *    AUTO_CLEAR_DELAY_MS so the bar stays clean. Conflicts + errors persist
 *    until resolved.
 *
 * 4. SESSION SUMMARY: When ALL items finish (no queued/uploading remaining),
 *    computeSession() is called and the bar shows a completion summary.
 */

import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { DocumentsService } from "@/api/generated";
import { queryKeys } from "@/lib/queryKeys";
import { useUploadStore, type ConflictInfo } from "../state/uploadStore";
import { AxiosError } from "axios";

// ─── Config ──────────────────────────────────────────────────────────────────

/** Max simultaneous uploads */
const MAX_CONCURRENT = 3;

/** How long to show completed/skipped items before auto-removing them (ms) */
const AUTO_CLEAR_DELAY_MS = 4000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateAutoRename(filename: string): string {
    const lastDot = filename.lastIndexOf(".");
    const name = lastDot > 0 ? filename.slice(0, lastDot) : filename;
    const ext = lastDot > 0 ? filename.slice(lastDot) : "";
    const date = new Date().toISOString().split("T")[0];
    return `${name}__${date}${ext}`;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

interface UseUploadQueueOptions {
    onUploadComplete?: (filename: string) => void;
    logAction?: (msg: string) => void;
}

export function useUploadQueue(options: UseUploadQueueOptions = {}) {
    const queryClient = useQueryClient();
    const { onUploadComplete, logAction } = options;

    // Track IDs currently being processed — Set avoids the boolean-ref race
    const inFlightIds = useRef<Set<string>>(new Set());
    // Track auto-clear timers so we can cancel on unmount
    const autoClearTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    // Store
    const queue = useUploadStore((s) => s.queue);
    const addToQueue = useUploadStore((s) => s.addToQueue);
    const setUploading = useUploadStore((s) => s.setUploading);
    const setProgress = useUploadStore((s) => s.setProgress);
    const setSuccess = useUploadStore((s) => s.setSuccess);
    const setSkipped = useUploadStore((s) => s.setSkipped);
    const setConflict = useUploadStore((s) => s.setConflict);
    const setError = useUploadStore((s) => s.setError);
    const removeFromQueue = useUploadStore((s) => s.removeFromQueue);
    const computeSession = useUploadStore((s) => s.computeSession);

    // ── Auto-clear helper ────────────────────────────────────────────────────

    const scheduleAutoClear = useCallback((id: string) => {
        // Cancel any existing timer for this id
        const existing = autoClearTimers.current.get(id);
        if (existing) clearTimeout(existing);

        const timer = setTimeout(() => {
            removeFromQueue(id);
            autoClearTimers.current.delete(id);
        }, AUTO_CLEAR_DELAY_MS);
        autoClearTimers.current.set(id, timer);
    }, [removeFromQueue]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            autoClearTimers.current.forEach(clearTimeout);
        };
    }, []);

    // ── Check if all done → compute session summary ──────────────────────────

    const checkAllDone = useCallback(() => {
        const q = useUploadStore.getState().queue;
        const stillActive = q.some(
            (item) => item.status === "queued" || item.status === "uploading"
        );
        if (!stillActive && q.length > 0) {
            computeSession();
        }
    }, [computeSession]);

    // ── Core upload function ─────────────────────────────────────────────────

    const uploadFile = useCallback(
        async (id: string, file: File) => {
            // Mark in-flight
            inFlightIds.current.add(id);
            setUploading(id);

            // Smooth fake progress while waiting for server
            let fakeProgress = 0;
            const progressInterval = setInterval(() => {
                fakeProgress = Math.min(fakeProgress + Math.random() * 15, 88);
                setProgress(id, Math.round(fakeProgress));
            }, 250);

            try {
                await DocumentsService.uploadDocumentApiV1DocumentsUploadPost({ file });

                clearInterval(progressInterval);
                setSuccess(id);
                queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
                onUploadComplete?.(file.name);
                logAction?.(`✓ UPLOADED: ${file.name}`);

                // Auto-clear successful items
                scheduleAutoClear(id);

            } catch (error) {
                clearInterval(progressInterval);

                if (error instanceof AxiosError && error.response?.status === 409) {
                    const conflict = error.response.data as ConflictInfo;

                    if (
                        conflict.conflict_type === "exact_duplicate" ||
                        conflict.conflict_type === "same_content"
                    ) {
                        // AUTO-SKIP: already in library, no user input needed
                        setSkipped(id, conflict);
                        logAction?.(`↷ SKIPPED (${conflict.conflict_type}): ${file.name}`);
                        // Auto-clear skipped items too
                        scheduleAutoClear(id);
                    } else {
                        // same_filename: genuinely ambiguous — surface to user
                        setConflict(id, conflict);
                        logAction?.(`⚠ CONFLICT (same_filename): ${file.name}`);
                        // Do NOT auto-clear — user must resolve
                    }
                } else {
                    const message =
                        error instanceof Error ? error.message : "Upload failed";
                    setError(id, message);
                    logAction?.(`✗ ERROR: ${file.name} — ${message}`);
                    // Auto-clear errors after a longer delay
                    scheduleAutoClear(id);
                }
            } finally {
                inFlightIds.current.delete(id);
                checkAllDone();
            }
        },
        [
            setUploading, setProgress, setSuccess, setSkipped, setConflict, setError,
            queryClient, onUploadComplete, logAction, scheduleAutoClear, checkAllDone,
        ]
    );

    // ── Queue processor — runs whenever queue changes ─────────────────────────

    useEffect(() => {
        // Find items that are queued and NOT already being processed
        const queuedItems = queue.filter(
            (item) => item.status === "queued" && !inFlightIds.current.has(item.id)
        );

        // Respect concurrency cap
        const slots = MAX_CONCURRENT - inFlightIds.current.size;
        if (slots <= 0) return;

        // Kick off up to `slots` new uploads
        queuedItems.slice(0, slots).forEach((item) => {
            uploadFile(item.id, item.file);
        });
    }, [queue, uploadFile]);

    // ── Replace existing document (user resolves same_filename conflict) ──────

    const replaceFile = useCallback(
        async (id: string, file: File, documentId: number) => {
            inFlightIds.current.add(id);
            setUploading(id);

            try {
                await DocumentsService.replaceDocumentApiV1DocumentsDocumentIdReplacePut(
                    documentId,
                    { file }
                );
                setSuccess(id);
                queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
                logAction?.(`↺ REPLACED: ${file.name}`);
                scheduleAutoClear(id);
            } catch (error) {
                const message = error instanceof Error ? error.message : "Replace failed";
                setError(id, message);
            } finally {
                inFlightIds.current.delete(id);
                checkAllDone();
            }
        },
        [setUploading, setSuccess, setError, queryClient, logAction, scheduleAutoClear, checkAllDone]
    );

    // ── Keep both (auto-rename + re-queue) ────────────────────────────────────

    const keepBothFile = useCallback(
        async (id: string, file: File) => {
            const newName = generateAutoRename(file.name);
            const renamedFile = new File([file], newName, { type: file.type });
            removeFromQueue(id);
            addToQueue([renamedFile]);
            logAction?.(`⇄ RENAMED: ${file.name} → ${newName}`);
        },
        [removeFromQueue, addToQueue, logAction]
    );

    // ── Computed ──────────────────────────────────────────────────────────────

    const isProcessing = queue.some((item) => item.status === "uploading");

    // ── Dropzone ──────────────────────────────────────────────────────────────

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            addToQueue(acceptedFiles);
            logAction?.(`+ QUEUED: ${acceptedFiles.length} file(s)`);
        },
        [addToQueue, logAction]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "application/pdf": [".pdf"],
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
            "text/plain": [".txt"],
            "text/markdown": [".md"],
            "image/png": [".png"],
            "image/jpeg": [".jpg", ".jpeg"],
            "image/tiff": [".tiff", ".tif"],
            "application/epub+zip": [".epub"],
        },
        multiple: true,
        noClick: false,
    });

    return {
        queue,
        hasQueue: queue.length > 0,
        isProcessing,
        getRootProps,
        getInputProps,
        isDragActive,
        addToQueue,
        replaceFile,
        keepBothFile,
        removeFromQueue,
    };
}
