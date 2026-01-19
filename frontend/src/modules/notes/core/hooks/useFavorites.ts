/**
 * useFavorites - Hook for managing favorite notes
 *
 * Provides functionality to fetch favorite notes and toggle favorite status.
 * Uses the /notes endpoint with is_favorite=true filter.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { request as __request } from '@/api/generated/core/request';
import { OpenAPI } from '@/api/generated/core/OpenAPI';
import { NotesService } from '@/api/generated';
import type { NoteResponse } from '@/modules/notes/core';

// Query keys
export const favoritesKeys = {
  all: ['notes', 'favorites'] as const,
  list: () => [...favoritesKeys.all, 'list'] as const,
};

/**
 * Fetch all favorite notes
 */
export function useFavorites() {
  return useQuery({
    queryKey: favoritesKeys.list(),
    queryFn: async (): Promise<NoteResponse[]> => {
      // Use direct request to support custom query params if not yet in generated client type definition
      // OR mostly just use the generated service if types allow. 
      // Since I just added is_favorite backend support but didn't regen client, I must use __request or cast
      return __request(OpenAPI, {
        method: 'GET',
        url: '/api/v1/notes',
        query: {
          is_favorite: true,
          page: 1,
          page_size: 100, // Reasonable limit for favorites list
        },
      });
    },
  });
}

/**
 * Toggle favorite status
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, isFavorite }: { noteId: number; isFavorite: boolean }) => {
      return NotesService.updateNoteApiV1NotesNoteIdPut(noteId, {
        is_favorite: isFavorite,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: favoritesKeys.list() });
      // Also invalidate list notes to refresh UI everywhere
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}
