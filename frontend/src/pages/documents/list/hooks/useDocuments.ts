import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DocumentsService } from "@/api/generated";
import { queryKeys } from "@/lib/queryKeys";
import { formatFileSize } from "@/lib/utils";
import type { EnhancedDocument } from "../../core";

/**
 * Custom hook for managing documents list
 *
 * NOTE: @hey-api/client-fetch returns { data, request, response }
 * We need to extract .data from each response
 */

interface UseDocumentsOptions {
    folderId?: number | null;
    includeAll?: boolean;
    view?: 'recent' | 'favorites' | 'archived';
}

export function useDocuments(options: UseDocumentsOptions = {}) {
    const { folderId = null, includeAll = false, view } = options;
    const queryClient = useQueryClient();

    // Fetch documents with folder/view filter
    const {
        data: documents,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: [...queryKeys.documents.list(), { folderId, includeAll, view }],
        queryFn: () => DocumentsService.listDocumentsApiV1DocumentsGet(
            folderId ?? undefined,  // folderId
            includeAll,              // includeAll
            view,                    // view (Smart Views filter)
            undefined,               // statusFilter
            1,                       // page
            100,                     // pageSize (fetch more for grid)
        ),
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
        sector: (doc as unknown as { sector?: string }).sector || "Uncategorized",
        type: doc.filename.split(".").pop() || "file",
        size: formatFileSize(doc.file_size),
        notes: (doc as unknown as { notes?: string }).notes || null,
        ai_summary: (doc as unknown as { ai_summary?: string }).ai_summary || null,
        reading_progress: (doc as unknown as { reading_progress?: number }).reading_progress || 0,
        content_text: (doc as unknown as { content_text?: string }).content_text || null,
        thumbnail_url: (doc as unknown as { thumbnail_url?: string }).thumbnail_url || null,
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
