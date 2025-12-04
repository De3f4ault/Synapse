import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    uploadDocumentApiV1DocumentsUploadPost,
    getProcessingStatusApiV1DocumentsDocumentIdStatusGet,
} from '@/api/generated';
import { QUERY_KEYS, DOCUMENTS } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';
import type { DocumentResponse, ProcessingStatusResponse } from '@/api/generated';

interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
}

interface UseDocumentUploadOptions {
    onUploadComplete?: (document: DocumentResponse) => void;
    onProcessingComplete?: (status: ProcessingStatusResponse) => void;
    onError?: (error: string) => void;
}

export function useDocumentUpload(options?: UseDocumentUploadOptions) {
    const queryClient = useQueryClient();
    const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
    const [uploadedDocumentId, setUploadedDocumentId] = useState<number | null>(null);

    // Upload mutation
    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            // Validate file before upload
            if (file.size > DOCUMENTS.MAX_FILE_SIZE) {
                throw new Error(`File size exceeds ${DOCUMENTS.MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
            }

            const acceptedTypes = Object.keys(DOCUMENTS.ACCEPTED_TYPES);
            if (!acceptedTypes.includes(file.type)) {
                throw new Error('Invalid file type. Accepted: PDF, DOCX, TXT, MD, EPUB');
            }

            // Reset progress
            setUploadProgress({ loaded: 0, total: file.size, percentage: 0 });

            // Note: The generated client doesn't support upload progress.
            // For real progress tracking, you'd need to use axios directly with onUploadProgress.
            // Here we simulate progress for UX purposes.
            const progressInterval = setInterval(() => {
                setUploadProgress((prev) => {
                    if (!prev || prev.percentage >= 90) return prev;
                    const newPercentage = Math.min(prev.percentage + 10, 90);
                    return {
                        ...prev,
                        loaded: (newPercentage / 100) * prev.total,
                                  percentage: newPercentage,
                    };
                });
            }, 200);

            try {
                const response = await uploadDocumentApiV1DocumentsUploadPost({
                    formData: { file },
                });

                clearInterval(progressInterval);
                setUploadProgress({ loaded: file.size, total: file.size, percentage: 100 });

                return response;
            } catch (error) {
                clearInterval(progressInterval);
                throw error;
            }
        },
        onSuccess: (document) => {
            setUploadedDocumentId(document.id);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DOCUMENTS.ALL });
            options?.onUploadComplete?.(document);
            toast.success('Upload complete', 'Document is now being processed');
        },
        onError: (error: Error) => {
            setUploadProgress(null);
            const message = error.message || 'Failed to upload document';
            options?.onError?.(message);
            toast.error('Upload failed', message);
        },
    });

    // Processing status polling
    const processingStatusQuery = useQuery({
        queryKey: uploadedDocumentId ? QUERY_KEYS.DOCUMENTS.STATUS(uploadedDocumentId) : [],
                                           queryFn: () =>
                                           uploadedDocumentId
                                           ? getProcessingStatusApiV1DocumentsDocumentIdStatusGet({
                                               documentId: uploadedDocumentId,
                                           })
                                           : Promise.reject('No document ID'),
                                           enabled: !!uploadedDocumentId,
                                           refetchInterval: (query) => {
                                               const data = query.state.data;
                                               if (!data) return DOCUMENTS.STATUS_POLL_INTERVAL;
                                               // Stop polling when completed or failed
                                               if (data.status === 'completed' || data.status === 'failed') {
                                                   if (data.status === 'completed') {
                                                       options?.onProcessingComplete?.(data);
                                                   }
                                                   return false;
                                               }
                                               return DOCUMENTS.STATUS_POLL_INTERVAL;
                                           },
    });

    const upload = useCallback(
        (file: File) => {
            setUploadedDocumentId(null);
            uploadMutation.mutate(file);
        },
        [uploadMutation]
    );

    const uploadMultiple = useCallback(
        (files: File[]) => {
            // Upload files sequentially
            files.forEach((file, index) => {
                setTimeout(() => {
                    upload(file);
                }, index * 500);
            });
        },
        [upload]
    );

    const reset = useCallback(() => {
        setUploadProgress(null);
        setUploadedDocumentId(null);
        uploadMutation.reset();
    }, [uploadMutation]);

    return {
        upload,
        uploadMultiple,
        reset,
        uploadProgress,
        isUploading: uploadMutation.isPending,
        uploadError: uploadMutation.error?.message,
        uploadedDocument: uploadMutation.data,
        processingStatus: processingStatusQuery.data,
        isProcessing:
        processingStatusQuery.data?.status === 'pending' ||
        processingStatusQuery.data?.status === 'processing',
        isComplete: processingStatusQuery.data?.status === 'completed',
        isFailed: processingStatusQuery.data?.status === 'failed',
    };
}

/**
 * Hook to poll processing status for a specific document.
 */
export function useProcessingStatus(documentId: number | null) {
    return useQuery({
        queryKey: documentId ? QUERY_KEYS.DOCUMENTS.STATUS(documentId) : [],
                    queryFn: () =>
                    documentId
                    ? getProcessingStatusApiV1DocumentsDocumentIdStatusGet({ documentId })
                    : Promise.reject('No document ID'),
                    enabled: !!documentId,
                    refetchInterval: (query) => {
                        const data = query.state.data;
                        if (!data) return DOCUMENTS.STATUS_POLL_INTERVAL;
                        if (data.status === 'completed' || data.status === 'failed') {
                            return false;
                        }
                        return DOCUMENTS.STATUS_POLL_INTERVAL;
                    },
    });
}

export default useDocumentUpload;
