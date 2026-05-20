import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DocumentsService } from "@/api/generated";
import type { Body_upload_document_api_v1_documents_upload_post } from "@/api/generated";
import { QUERY_KEYS, DOCUMENTS } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import type {
  DocumentResponse,
  ProcessingStatusResponse,
} from "@/api/generated";

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
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null,
  );
  const [uploadedDocumentId, setUploadedDocumentId] = useState<number | null>(
    null,
  );
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setCurrentFile(file);
      // Validate file before upload
      if (file.size > DOCUMENTS.MAX_FILE_SIZE) {
        throw new Error(
          `File size exceeds ${DOCUMENTS.MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
        );
      }

      const acceptedTypes = Object.keys(DOCUMENTS.ACCEPTED_TYPES);
      if (!acceptedTypes.includes(file.type)) {
        throw new Error(
          "Invalid file type. Accepted: PDF, DOCX, TXT, MD, EPUB",
        );
      }

      // Reset progress
      setUploadProgress({ loaded: 0, total: file.size, percentage: 0 });

      // Simulate progress for UX
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
        const formData: Body_upload_document_api_v1_documents_upload_post = {
          file,
        };
        const response =
          await DocumentsService.uploadDocumentApiV1DocumentsUploadPost(
            formData,
          );

        clearInterval(progressInterval);
        setUploadProgress({
          loaded: file.size,
          total: file.size,
          percentage: 100,
        });

        return response;
      } catch (error: any) {
        clearInterval(progressInterval);

        // Enhance duplicate file error message
        if (error.status === 409 && error.body?.conflict_type) {
          const type = error.body.conflict_type;
          const filename = error.body.existing_filename;

          if (type === "exact_duplicate") {
            throw new Error(
              `Duplicate: "${filename || "File"}" already exists in your library.`,
            );
          }
          if (type === "same_content") {
            throw new Error(
              `Content exists: A file named "${filename}" has identical content.`
            );
          }
        }

        throw error;
      }
    },
    onSuccess: (document) => {
      setUploadedDocumentId(document.id);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DOCUMENTS.ALL });
      options?.onUploadComplete?.(document);
      toast({
        title: "Upload complete",
        description: "Document is now being processed",
      });
    },
    onError: (error: Error) => {
      setUploadProgress(null);
      const message = error.message || "Failed to upload document";
      options?.onError?.(message);
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Processing status polling
  const processingStatusQuery = useQuery<ProcessingStatusResponse>({
    queryKey: uploadedDocumentId
      ? QUERY_KEYS.DOCUMENTS.STATUS(uploadedDocumentId)
      : [],
    queryFn: async () => {
      if (!uploadedDocumentId) throw new Error("No document ID");
      return DocumentsService.getProcessingStatusApiV1DocumentsDocumentIdStatusGet(
        uploadedDocumentId,
      );
    },
    enabled: !!uploadedDocumentId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return DOCUMENTS.STATUS_POLL_INTERVAL;
      // Stop polling when completed or failed
      if (data.status === "completed" || data.status === "failed") {
        if (data.status === "completed") {
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
    [uploadMutation],
  );

  const uploadMultiple = useCallback(
    (files: File[]) => {
      files.forEach((file, index) => {
        setTimeout(() => {
          upload(file);
        }, index * 500);
      });
    },
    [upload],
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
    currentFile,
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error instanceof Error ? uploadMutation.error.message : null,
    uploadedDocument: uploadMutation.data,
    processingStatus: processingStatusQuery.data,
    // isProcessing: true for any state that hasn't reached a terminal status
    isProcessing:
      processingStatusQuery.data?.status === "pending" ||
      processingStatusQuery.data?.status === "parsing" ||
      processingStatusQuery.data?.status === "parsed" ||
      processingStatusQuery.data?.status === "chunking",
    isComplete: processingStatusQuery.data?.status === "completed",
    isFailed: processingStatusQuery.data?.status === "failed",
  };
}

/**
 * Hook to poll processing status for a specific document.
 */
export function useProcessingStatus(documentId: number | null) {
  return useQuery<ProcessingStatusResponse>({
    queryKey: documentId ? QUERY_KEYS.DOCUMENTS.STATUS(documentId) : [],
    queryFn: async () => {
      if (!documentId) throw new Error("No document ID");
      return DocumentsService.getProcessingStatusApiV1DocumentsDocumentIdStatusGet(
        documentId,
      );
    },
    enabled: !!documentId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return DOCUMENTS.STATUS_POLL_INTERVAL;
      if (data.status === "completed" || data.status === "failed") {
        return false;
      }
      return DOCUMENTS.STATUS_POLL_INTERVAL;
    },
  });
}

export default useDocumentUpload;
