import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { DocumentsService } from "@/api/generated";
import { queryKeys } from "@/lib/queryKeys";
import { useUploadStore, type ConflictInfo } from "../state/uploadStore";
import { AxiosError } from "axios";

interface UseUploadQueueOptions {
    onUploadComplete?: (filename: string) => void;
    logAction?: (msg: string) => void;
}

/**
 * Generate auto-renamed filename: name__YYYY-MM-DD.ext
 */
function generateAutoRename(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    const name = lastDot > 0 ? filename.slice(0, lastDot) : filename;
    const ext = lastDot > 0 ? filename.slice(lastDot) : '';
    const date = new Date().toISOString().split('T')[0];
    return `${name}__${date}${ext}`;
}

/**
 * Hook for managing the FSM-based upload queue.
 * 
 * Each file goes through: queued → uploading → success | conflict | error
 * Conflicts are resolved inline via UI callbacks.
 */
export function useUploadQueue(options: UseUploadQueueOptions = {}) {
    const queryClient = useQueryClient();
    const { onUploadComplete, logAction } = options;
    const processingRef = useRef(false);

    // Store selectors
    const queue = useUploadStore((s) => s.queue);
    const addToQueue = useUploadStore((s) => s.addToQueue);
    const setUploading = useUploadStore((s) => s.setUploading);
    const setProgress = useUploadStore((s) => s.setProgress);
    const setSuccess = useUploadStore((s) => s.setSuccess);
    const setConflict = useUploadStore((s) => s.setConflict);
    const setError = useUploadStore((s) => s.setError);
    const removeFromQueue = useUploadStore((s) => s.removeFromQueue);

    // Upload a single file
    const uploadFile = useCallback(async (id: string, file: File) => {
        setUploading(id);

        // Simulate progress
        const progressInterval = setInterval(() => {
            setProgress(id, Math.min(90, Math.random() * 100));
        }, 200);

        try {
            const formData = { file };
            await DocumentsService.uploadDocumentApiV1DocumentsUploadPost(formData);

            clearInterval(progressInterval);
            setSuccess(id);

            queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
            onUploadComplete?.(file.name);
            logAction?.(`UPLOADED: ${file.name}`);

        } catch (error) {
            clearInterval(progressInterval);

            // Check for 409 Conflict
            if (error instanceof AxiosError && error.response?.status === 409) {
                const conflict = error.response.data as ConflictInfo;
                setConflict(id, conflict);
                logAction?.(`CONFLICT: ${file.name}`);
                return;
            }

            // Other errors
            const message = error instanceof Error ? error.message : 'Upload failed';
            setError(id, message);
            logAction?.(`ERROR: ${file.name} - ${message}`);
        }
    }, [setUploading, setProgress, setSuccess, setConflict, setError, queryClient, onUploadComplete, logAction]);

    // Replace existing document
    const replaceFile = useCallback(async (id: string, file: File, documentId: number) => {
        setUploading(id);

        try {
            const formData = { file };
            await DocumentsService.replaceDocumentApiV1DocumentsDocumentIdReplacePut(documentId, formData);

            setSuccess(id);
            queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
            toast.success('Document replaced successfully');
            logAction?.(`REPLACED: ${file.name}`);

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Replace failed';
            setError(id, message);
            toast.error('Replace failed', { description: message });
        }
    }, [setUploading, setSuccess, setError, queryClient, logAction]);

    // Keep both (auto-rename and upload)
    const keepBothFile = useCallback(async (id: string, file: File) => {
        const newName = generateAutoRename(file.name);
        const renamedFile = new File([file], newName, { type: file.type });

        // Remove old item and add renamed one
        removeFromQueue(id);
        addToQueue([renamedFile]);

        toast.info(`Renamed to ${newName}`);
        logAction?.(`RENAMED: ${file.name} → ${newName}`);
    }, [removeFromQueue, addToQueue, logAction]);

    // Process queue - upload next queued item
    useEffect(() => {
        const processNext = async () => {
            if (processingRef.current) return;

            const nextQueued = queue.find((item) => item.status === 'queued');
            if (!nextQueued) return;

            processingRef.current = true;
            await uploadFile(nextQueued.id, nextQueued.file);
            processingRef.current = false;
        };

        processNext();
    }, [queue, uploadFile]);

    // Dropzone handler
    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            addToQueue(acceptedFiles);
            logAction?.(`QUEUED: ${acceptedFiles.length} file(s)`);
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
        },
        multiple: true,
        noClick: false,
    });

    // Is any file currently being processed (uploading or replacing)?
    const isProcessing = queue.some((item) => item.status === 'uploading');

    return {
        // Queue state
        queue,
        hasQueue: queue.length > 0,
        isProcessing,

        // Dropzone
        getRootProps,
        getInputProps,
        isDragActive,

        // Actions
        addToQueue,
        replaceFile,
        keepBothFile,
        removeFromQueue,
    };
}
