import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { DocumentsService } from "@/api/generated";
import { queryKeys } from "@/lib/queryKeys";
import { type UploadProgress } from "../state";
import { AxiosError } from "axios";

interface ConflictInfo {
    conflict_type: 'exact_duplicate' | 'same_content' | 'same_filename';
    existing_document_id: number;
    existing_filename: string;
    existing_file_size: number;
    existing_uploaded_at: string;
    message: string;
}

interface UseDocumentUploadOptions {
    onUploadStart?: (filename: string) => void;
    onUploadComplete?: (filename: string) => void;
    onUploadError?: (filename: string, error: Error) => void;
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
 * Custom hook for handling document uploads with progress tracking and conflict resolution
 */
export function useDocumentUpload(options: UseDocumentUploadOptions = {}) {
    const queryClient = useQueryClient();
    const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
    const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
    const [conflictFile, setConflictFile] = useState<File | null>(null);

    const { onUploadStart, onUploadComplete, onUploadError, logAction } = options;

    // Upload mutation
    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            const fileId = file.name;
            setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

            // Simulate progress updates
            const interval = setInterval(() => {
                setUploadProgress((prev) => {
                    const current = prev[fileId] || 0;
                    if (current >= 90) {
                        clearInterval(interval);
                        return prev;
                    }
                    return { ...prev, [fileId]: current + 10 };
                });
            }, 200);

            try {
                const formData = { file };
                const result =
                    await DocumentsService.uploadDocumentApiV1DocumentsUploadPost(formData);

                clearInterval(interval);
                setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }));

                // Clear progress after delay
                setTimeout(() => {
                    setUploadProgress((prev) => {
                        const next = { ...prev };
                        delete next[fileId];
                        return next;
                    });
                }, 1000);

                return result;
            } catch (error) {
                clearInterval(interval);

                // Check for 409 Conflict
                if (error instanceof AxiosError && error.response?.status === 409) {
                    const conflict = error.response.data as ConflictInfo;
                    setConflictInfo(conflict);
                    setConflictFile(file);
                    setUploadProgress((prev) => {
                        const next = { ...prev };
                        delete next[fileId];
                        return next;
                    });
                    // Don't throw - let conflict modal handle it
                    return null;
                }
                throw error;
            }
        },
        onSuccess: (result, file) => {
            if (result === null) return; // Conflict detected, modal will handle
            queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
            toast.success("Document uploaded successfully");
            onUploadComplete?.(file.name);
            logAction?.("UPLOAD COMPLETE");
        },
        onError: (error, file) => {
            const fileId = file.name;
            setUploadProgress((prev) => {
                const next = { ...prev };
                delete next[fileId];
                return next;
            });
            toast.error("Upload failed", {
                description: error instanceof Error ? error.message : "Unknown error",
            });
            onUploadError?.(file.name, error as Error);
            logAction?.("UPLOAD FAILED");
        },
    });

    // Replace mutation
    const replaceMutation = useMutation({
        mutationFn: async ({ documentId, file }: { documentId: number; file: File }) => {
            const formData = { file };
            return await DocumentsService.replaceDocumentApiV1DocumentsDocumentIdReplacePut(
                documentId,
                formData
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
            toast.success("Document replaced successfully");
            clearConflict();
            logAction?.("DOCUMENT REPLACED");
        },
        onError: (error) => {
            toast.error("Replace failed", {
                description: error instanceof Error ? error.message : "Unknown error",
            });
        },
    });

    // Handle replace action
    const handleReplace = useCallback(() => {
        if (conflictInfo && conflictFile) {
            replaceMutation.mutate({
                documentId: conflictInfo.existing_document_id,
                file: conflictFile,
            });
        }
    }, [conflictInfo, conflictFile, replaceMutation]);

    // Handle keep both (auto-rename)
    const handleKeepBoth = useCallback(() => {
        if (conflictFile) {
            const newName = generateAutoRename(conflictFile.name);
            const renamedFile = new File([conflictFile], newName, { type: conflictFile.type });
            clearConflict();
            uploadMutation.mutate(renamedFile);
            logAction?.(`UPLOADING (renamed): ${newName}`);
        }
    }, [conflictFile, uploadMutation, logAction]);

    // Clear conflict state
    const clearConflict = useCallback(() => {
        setConflictInfo(null);
        setConflictFile(null);
    }, []);

    // Dropzone handler
    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            acceptedFiles.forEach((file) => {
                onUploadStart?.(file.name);
                uploadMutation.mutate(file);
                logAction?.(`UPLOADING: ${file.name}`);
            });
        },
        [uploadMutation, onUploadStart, logAction],
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "application/pdf": [".pdf"],
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                [".docx"],
            "text/plain": [".txt"],
        },
        multiple: true,
    });

    return {
        uploadProgress,
        getRootProps,
        getInputProps,
        isDragActive,
        isUploading: uploadMutation.isPending || replaceMutation.isPending,
        uploadDocument: uploadMutation.mutate,
        // Conflict resolution
        conflictInfo,
        conflictFile,
        handleReplace,
        handleKeepBoth,
        clearConflict,
        isReplacing: replaceMutation.isPending,
    };
}
