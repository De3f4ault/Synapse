// Documents hooks using TanStack Query
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DocumentsService } from "../generated";
import type {
  DocumentResponse,
  DocumentChunkResponse,
  ProcessingStatusResponse,
  Body_upload_document_api_v1_documents_upload_post,
} from "../generated";

const DOC_KEYS = {
  all: ["documents"] as const,
  list: () => [...DOC_KEYS.all, "list"] as const,
  detail: (id: number) => [...DOC_KEYS.all, "detail", id] as const,
  chunks: (id: number) => [...DOC_KEYS.all, "chunks", id] as const,
  status: (id: number) => [...DOC_KEYS.all, "status", id] as const,
};

/**
 * Hook to list documents with optional filtering
 */
export const useDocuments = (params?: {
  folderId?: number | null;
  smartView?: string | null;
  statusFilter?: string | null;
  search?: string | null;
  sortBy?: string | null;
  sortOrder?: string | null;
  page?: number;
  pageSize?: number;
}) => {
  return useQuery<DocumentResponse[]>({
    queryKey: [...DOC_KEYS.list(), { folderId: params?.folderId, smartView: params?.smartView }],
    queryFn: () =>
      DocumentsService.listDocumentsApiV1DocumentsGet(
        params?.folderId ?? undefined,
        params?.smartView ?? undefined,
        params?.statusFilter ?? undefined,
        params?.search ?? undefined,
        params?.sortBy ?? undefined,
        params?.sortOrder ?? undefined,
        params?.page,
        params?.pageSize,
      ),
  });
};

/**
 * Hook to get a specific document
 */
export const useDocument = (documentId: number) => {
  return useQuery<DocumentResponse>({
    queryKey: DOC_KEYS.detail(documentId),
    queryFn: () =>
      DocumentsService.getDocumentApiV1DocumentsDocumentIdGet(documentId),
    enabled: !!documentId,
  });
};

/**
 * Hook to get document chunks
 */
export const useDocumentChunks = (
  documentId: number,
  params?: { page?: number; pageSize?: number },
) => {
  return useQuery<DocumentChunkResponse[]>({
    queryKey: DOC_KEYS.chunks(documentId),
    queryFn: () =>
      DocumentsService.getDocumentChunksApiV1DocumentsDocumentIdChunksGet(
        documentId,
        params?.page,
        params?.pageSize,
      ),
    enabled: !!documentId,
  });
};

/**
 * Hook to get document processing status
 */
export const useDocumentStatus = (documentId: number) => {
  return useQuery<ProcessingStatusResponse>({
    queryKey: DOC_KEYS.status(documentId),
    queryFn: () =>
      DocumentsService.getProcessingStatusApiV1DocumentsDocumentIdStatusGet(
        documentId,
      ),
    enabled: !!documentId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return data.status === "processing" ? 2000 : false;
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
      const formData: Body_upload_document_api_v1_documents_upload_post = {
        file,
      };
      return DocumentsService.uploadDocumentApiV1DocumentsUploadPost(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOC_KEYS.list() });
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
      DocumentsService.deleteDocumentApiV1DocumentsDocumentIdDelete(
        documentId,
        deleteFile,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOC_KEYS.list() });
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
      DocumentsService.triggerProcessingApiV1DocumentsDocumentIdProcessPost(
        documentId,
      ),
    onSuccess: (_, documentId) => {
      queryClient.invalidateQueries({ queryKey: DOC_KEYS.status(documentId) });
      queryClient.invalidateQueries({ queryKey: DOC_KEYS.detail(documentId) });
    },
  });
};
