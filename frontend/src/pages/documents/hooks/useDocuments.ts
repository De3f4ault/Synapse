import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    listDocumentsApiV1DocumentsGet,
    deleteDocumentApiV1DocumentsDocumentIdDelete,
} from '@/api/generated/services.gen';
import { queryKeys } from '@/lib/queryKeys';
import type { DocumentResponse } from '@/api/generated/types.gen';
import type { EnhancedDocument } from '../types/documents.types';

/**
 * Map document to sector based on status
 */
const mapDocToSector = (doc: DocumentResponse): string => {
    if (doc.processing_status === 'completed') return 'Assets';
    if (doc.processing_status === 'processing') return 'Dev';
    if (doc.processing_status === 'failed') return 'System';
    return 'Logs';
};

/**
 * Custom hook for managing documents
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
                 queryFn: () => listDocumentsApiV1DocumentsGet(),
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) =>
        deleteDocumentApiV1DocumentsDocumentIdDelete({ documentId: id }),
                                       onSuccess: () => {
                                           queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
                                           toast.success('Document deleted successfully');
                                       },
                                       onError: (error) => {
                                           toast.error('Failed to delete document', {
                                               description: error instanceof Error ? error.message : 'Unknown error',
                                           });
                                       },
    });

    // Transform documents to enhanced format
    const enhancedDocuments: EnhancedDocument[] =
    documents?.map((doc) => ({
        ...doc,
        sector: mapDocToSector(doc),
                             type: doc.filename.split('.').pop() || 'file',
                             size: `${(doc.file_size / 1024).toFixed(2)} KB`,
    })) || [];

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
