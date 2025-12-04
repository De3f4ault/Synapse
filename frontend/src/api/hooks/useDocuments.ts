// Documents hooks using TanStack Query
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    uploadDocumentApiV1DocumentsUploadPost,
    listDocumentsApiV1DocumentsGet,
    getDocumentApiV1DocumentsDocumentIdGet,
    deleteDocumentApiV1DocumentsDocumentIdDelete,
    getDocumentChunksApiV1DocumentsDocumentIdChunksGet,
    getProcessingStatusApiV1DocumentsDocumentIdStatusGet,
    triggerProcessingApiV1DocumentsDocumentIdProcessPost,
} from '../generated';
import type {
    DocumentResponse,
    DocumentChunkResponse,
    ProcessingStatusResponse,
    ProcessingStatus,
} from '../generated';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Hook to list documents with optional filtering
 */
export const useDocuments = (params?: {
    statusFilter?: ProcessingStatus;
    page?: number;
    pageSize?: number;
}) => {
    return useQuery<DocumentResponse[]>({
        queryKey: queryKeys.documents.list(),  // ❗ corrected
                                        queryFn: () => listDocumentsApiV1DocumentsGet(params || {}),
    });
};

/**
 * Hook to get a specific document
 */
export const useDocument = (documentId: number) => {
    return useQuery<DocumentResponse>({
        queryKey: queryKeys.documents.detail(documentId),
                                      queryFn: () => getDocumentApiV1DocumentsDocumentIdGet({ documentId }),
                                      enabled: !!documentId,
    });
};

/**
 * Hook to get document chunks
 */
export const useDocumentChunks = (
    documentId: number,
    params?: { page?: number; pageSize?: number }
) => {
    return useQuery<DocumentChunkResponse[]>({
        queryKey: queryKeys.documents.chunks(documentId),  // ❗ corrected
                                             queryFn: () =>
                                             getDocumentChunksApiV1DocumentsDocumentIdChunksGet({
                                                 documentId,
                                                 ...params,
                                             }),
                                             enabled: !!documentId,
    });
};

/**
 * Hook to get document processing status
 * Auto-polls every 2 seconds while processing
 */
export const useDocumentStatus = (documentId: number) => {
    return useQuery<ProcessingStatusResponse>({
        queryKey: queryKeys.documents.status(documentId),
                                              queryFn: () =>
                                              getProcessingStatusApiV1DocumentsDocumentIdStatusGet({ documentId }),
                                              enabled: !!documentId,
                                              refetchInterval: (data) => {
                                                  if (!data) return false;
                                                  return data.status === 'processing' ? 2000 : false;
                                              },
    });
};

/**
 * Hook to upload a document
 */
export const useUploadDocument = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (file: File) => {
            const formData = { file };
            return uploadDocumentApiV1DocumentsUploadPost({ formData });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.documents.list() }); // ❗ corrected
        },
    });
};

/**
 * Hook to delete a document
 */
export const useDeleteDocument = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            documentId,
            deleteFile = false,
        }: {
            documentId: number;
            deleteFile?: boolean;
        }) =>
        deleteDocumentApiV1DocumentsDocumentIdDelete({ documentId, deleteFile }),
                       onSuccess: () => {
                           queryClient.invalidateQueries({ queryKey: queryKeys.documents.list() }); // ❗ corrected
                       },
    });
};

/**
 * Hook to manually trigger document processing
 */
export const useTriggerProcessing = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (documentId: number) =>
        triggerProcessingApiV1DocumentsDocumentIdProcessPost({ documentId }),
                       onSuccess: (_, documentId) => {
                           queryClient.invalidateQueries({
                               queryKey: queryKeys.documents.status(documentId),
                           });
                           queryClient.invalidateQueries({
                               queryKey: queryKeys.documents.detail(documentId),
                           });
                       },
    });
};
