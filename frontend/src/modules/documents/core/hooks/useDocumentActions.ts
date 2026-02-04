/**
 * Document Actions Hook
 * 
 * Mutations for document actions: update, toggle favorite, archive, download.
 * Phase 2A: Document Agency
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DocumentsService } from '@/api/generated';
import { queryKeys } from '@/lib/queryKeys';

interface UpdateDocumentParams {
  id: number;
  title?: string;
  is_favorite?: boolean;
  is_archived?: boolean;
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, title, is_favorite, is_archived }: UpdateDocumentParams) => {
      return DocumentsService.updateDocumentApiV1DocumentsDocumentIdPatch(id, {
        title,
        is_favorite,
        is_archived,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
    onError: (error) => {
      console.error('Failed to update document:', error);
      toast.error('Failed to update document');
    },
  });
}

export function useToggleFavorite() {
  const updateDocument = useUpdateDocument();

  return {
    mutate: (docId: number, currentFavorite: boolean) => {
      updateDocument.mutate(
        { id: docId, is_favorite: !currentFavorite },
        { onSuccess: () => toast.success(currentFavorite ? 'Removed from favorites' : 'Added to favorites') }
      );
    },
    isPending: updateDocument.isPending,
  };
}

export function useArchiveDocument() {
  const updateDocument = useUpdateDocument();

  return {
    mutate: (docId: number) => {
      updateDocument.mutate(
        { id: docId, is_archived: true },
        { onSuccess: () => toast.success('Document archived') }
      );
    },
    isPending: updateDocument.isPending,
  };
}

export function useRenameDocument() {
  const updateDocument = useUpdateDocument();

  return {
    mutate: (docId: number, newTitle: string) => {
      updateDocument.mutate(
        { id: docId, title: newTitle },
        { onSuccess: () => toast.success('Document renamed') }
      );
    },
    mutateAsync: async (docId: number, newTitle: string) => {
      return updateDocument.mutateAsync({ id: docId, title: newTitle });
    },
    isPending: updateDocument.isPending,
  };
}

export function useDownloadDocument() {
  return useMutation({
    mutationFn: async (documentId: number) => {
      // Get the download URL from the API
      const response = await DocumentsService.downloadDocumentApiV1DocumentsDocumentIdDownloadGet(documentId);
      return response;
    },
    onSuccess: (response) => {
      // response should contain the download_url
      if (response && typeof response === 'object' && 'download_url' in response) {
        const url = (response as { download_url: string }).download_url;
        window.open(url, '_blank');
      } else {
        toast.error('Download URL not available');
      }
    },
    onError: (error) => {
      console.error('Failed to download document:', error);
      toast.error('Failed to download document');
    },
  });
}
