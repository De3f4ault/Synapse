import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DocumentsService } from "@/api/generated";
import { queryKeys } from "@/lib/queryKeys";
import { formatFileSize } from "@/lib/utils";
import type { DocumentResponse } from "@/api/generated";
import type { EnhancedDocument } from "../types/documents.types";

/**
 * Custom hook for managing documents
 *
 * NOTE: @hey-api/client-fetch returns { data, request, response }
 * We need to extract .data from each response
 */
export function useDocuments() {
  const queryClient = useQueryClient();

  // Fetch documents
  const {
    data: documents,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.documents.list(),
    queryFn: () => DocumentsService.listDocumentsApiV1DocumentsGet(),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      DocumentsService.deleteDocumentApiV1DocumentsDocumentIdDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
      toast.success("Document deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete document", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  // Transform documents to enhanced format
  const enhancedDocuments: EnhancedDocument[] = (
    Array.isArray(documents) ? documents : []
  ).map((doc) => ({
    ...doc,
    sector: (doc as any).sector || "Uncategorized",
    type: doc.filename.split(".").pop() || "file",
    size: formatFileSize(doc.file_size),
    notes: (doc as any).notes || null,
    ai_summary: (doc as any).ai_summary || null,
    reading_progress: (doc as any).reading_progress || 0,
    content_text: (doc as any).content_text || null,
  }));

  return {
    documents: enhancedDocuments,
    rawDocuments: documents,
    isLoading,
    error,
    refetch,
    deleteDocument: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
