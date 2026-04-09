/**
 * useFileUpload - Chat attachment upload hook
 *
 * Handles file uploads for chat messages via the REST API.
 * Supports multiple files with progress tracking, previews,
 * and deduplication.
 *
 * Usage:
 *   const { pendingFiles, uploadFile, removeFile, documentIds } = useFileUpload(sessionId);
 */

import { useState, useCallback, useRef } from "react";
import { getAuthToken } from "@/api/client";

// ==================== TYPES ====================

export interface PendingFile {
  /** Client-side UUID */
  id: string;
  /** Original File object */
  file: File;
  /** Object URL for image preview */
  preview: string;
  /** Upload status */
  status: "pending" | "uploading" | "uploaded" | "error";
  /** Upload progress 0-100 */
  progress: number;
  /** Server Document ID after upload */
  documentId?: number;
  /** Thumbnail URL from server */
  thumbnailUrl?: string;
  /** Error message if failed */
  error?: string;
}

interface UploadResponse {
  document_id: number;
  filename: string;
  content_type: string;
  size_bytes: number;
  url: string;
  thumbnail_url: string | null;
}

// ==================== CONSTANTS ====================

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILES = 5;

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/heic",
  "application/pdf",
]);

// ==================== HOOK ====================

export function useFileUpload(sessionId?: number) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  /**
   * Upload a single file to the chat attachments API.
   */
  const uploadFile = useCallback(
    async (file: File) => {
      // Validate
      if (!ALLOWED_TYPES.has(file.type)) {
        console.warn("[Upload] Unsupported type:", file.type);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        console.warn("[Upload] File too large:", file.size);
        return;
      }

      // Check max files limit
      setPendingFiles((prev) => {
        if (prev.length >= MAX_FILES) {
          console.warn("[Upload] Max files reached");
          return prev;
        }
        return prev;
      });

      // Create pending entry
      const id = crypto.randomUUID();
      const preview = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : "";

      const pending: PendingFile = {
        id,
        file,
        preview,
        status: "pending",
        progress: 0,
      };

      setPendingFiles((prev) => {
        if (prev.length >= MAX_FILES) return prev;
        return [...prev, pending];
      });

      // Upload via fetch
      const controller = new AbortController();
      abortControllers.current.set(id, controller);

      try {
        setPendingFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, status: "uploading" as const, progress: 10 } : f,
          ),
        );

        const formData = new FormData();
        formData.append("file", file);
        if (sessionId) {
          formData.append("session_id", sessionId.toString());
        }

        const token = getAuthToken();

        // Progress simulation (fetch doesn't have native upload progress)
        const progressInterval = setInterval(() => {
          setPendingFiles((prev) =>
            prev.map((f) =>
              f.id === id && f.status === "uploading"
                ? { ...f, progress: Math.min(f.progress + 15, 85) }
                : f,
            ),
          );
        }, 200);

        const response = await fetch(
          `${API_BASE}/api/v1/chat/attachments/upload`,
          {
            method: "POST",
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
            signal: controller.signal,
            credentials: "include",
          },
        );

        clearInterval(progressInterval);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.detail || `Upload failed: ${response.status}`,
          );
        }

        const data: UploadResponse = await response.json();

        setPendingFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  status: "uploaded" as const,
                  progress: 100,
                  documentId: data.document_id,
                  thumbnailUrl: data.thumbnail_url
                    ? `${API_BASE}${data.thumbnail_url}`
                    : undefined,
                }
              : f,
          ),
        );

        console.log("[Upload] Success:", data.document_id, data.filename);
      } catch (err: any) {
        if (err.name === "AbortError") {
          // User cancelled — remove from list
          setPendingFiles((prev) => prev.filter((f) => f.id !== id));
        } else {
          console.error("[Upload] Failed:", err);
          setPendingFiles((prev) =>
            prev.map((f) =>
              f.id === id
                ? {
                    ...f,
                    status: "error" as const,
                    progress: 0,
                    error: err.message || "Upload failed",
                  }
                : f,
            ),
          );
        }
      } finally {
        abortControllers.current.delete(id);
      }
    },
    [sessionId],
  );

  /**
   * Upload multiple files (e.g., from file picker or drop).
   */
  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).slice(
        0,
        MAX_FILES - pendingFiles.length,
      );
      await Promise.all(fileArray.map(uploadFile));
    },
    [uploadFile, pendingFiles.length],
  );

  /**
   * Remove a file from pending list and cancel upload if in progress.
   */
  const removeFile = useCallback((id: string) => {
    // Cancel in-progress upload
    const controller = abortControllers.current.get(id);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(id);
    }

    // Revoke preview URL
    setPendingFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  /**
   * Clear all pending files.
   */
  const clearAll = useCallback(() => {
    // Cancel all uploads
    abortControllers.current.forEach((c) => c.abort());
    abortControllers.current.clear();

    // Revoke all preview URLs
    setPendingFiles((prev) => {
      prev.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
      return [];
    });
  }, []);

  // Document IDs of successfully uploaded files (ready to send)
  const documentIds = pendingFiles
    .filter((f) => f.status === "uploaded" && f.documentId)
    .map((f) => f.documentId!);

  const hasFiles = pendingFiles.length > 0;
  const isUploading = pendingFiles.some((f) => f.status === "uploading");
  const allUploaded =
    hasFiles && pendingFiles.every((f) => f.status === "uploaded");
  const canAttachMore = pendingFiles.length < MAX_FILES;

  return {
    pendingFiles,
    uploadFile,
    uploadFiles,
    removeFile,
    clearAll,
    documentIds,
    hasFiles,
    isUploading,
    allUploaded,
    canAttachMore,
  };
}

export default useFileUpload;
