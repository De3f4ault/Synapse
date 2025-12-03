import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { uploadDocumentApiV1DocumentsUploadPost } from '@/api/generated/services.gen';
import { queryKeys } from '@/lib/queryKeys';
import type { UploadProgress } from '../types/documents.types';

interface UseDocumentUploadOptions {
    onUploadStart?: (filename: string) => void;
    onUploadComplete?: (filename: string) => void;
    onUploadError?: (filename: string, error: Error) => void;
    logAction?: (msg: string) => void;
}

/**
 * Custom hook for handling document uploads with progress tracking
 */
export function useDocumentUpload(options: UseDocumentUploadOptions = {}) {
    const queryClient = useQueryClient();
    const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});

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

            const formData = { file };
            const result = await uploadDocumentApiV1DocumentsUploadPost({ formData });

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
        },
        onSuccess: (_, file) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
            toast.success('Document uploaded successfully');
            onUploadComplete?.(file.name);
            logAction?.('UPLOAD COMPLETE');
        },
        onError: (error, file) => {
            const fileId = file.name;
            setUploadProgress((prev) => {
                const next = { ...prev };
                delete next[fileId];
                return next;
            });
            toast.error('Upload failed', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
            onUploadError?.(file.name, error as Error);
            logAction?.('UPLOAD FAILED');
        },
    });

    // Dropzone handler
    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            acceptedFiles.forEach((file) => {
                onUploadStart?.(file.name);
                uploadMutation.mutate(file);
                logAction?.(`UPLOADING: ${file.name}`);
            });
        },
        [uploadMutation, onUploadStart, logAction]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'text/plain': ['.txt'],
        },
        multiple: true,
    });

    return {
        uploadProgress,
        getRootProps,
        getInputProps,
        isDragActive,
        isUploading: uploadMutation.isPending,
        uploadDocument: uploadMutation.mutate,
    };
}
