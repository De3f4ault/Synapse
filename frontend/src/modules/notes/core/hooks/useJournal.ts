/**
 * useJournal - Hook for journal API operations
 *
 * Provides journal CRUD via backend API instead of local-only BlockSuite docs.
 * Journals persist across browser refreshes.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OpenAPI } from '@/api/generated/core/OpenAPI';
import { request as __request } from '@/api/generated/core/request';
import { NotesService } from '@/api/generated';
import type { NoteUpdate } from '@/api/generated';

// Types
export interface JournalDateEntry {
  date: string; // YYYY-MM-DD
  note_id: number;
  title: string;
}

export interface JournalNote {
  id: number;
  title: string;
  content: Record<string, unknown>;
  format: string;
  parent_id: number | null;
  user_id: number;
  embedding_id: string | null;
  journal_date: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  children_count: number;
}

// Query keys
export const journalKeys = {
  all: ['journals'] as const,
  dates: () => [...journalKeys.all, 'dates'] as const,
  date: (date: string) => [...journalKeys.all, 'date', date] as const,
};

/**
 * Fetch all journal dates
 */
export function useJournalDates() {
  return useQuery({
    queryKey: journalKeys.dates(),
    queryFn: async (): Promise<JournalDateEntry[]> => {
      return __request(OpenAPI, {
        method: 'GET',
        url: '/api/v1/notes/journals/dates',
      });
    },
  });
}

/**
 * Get or create a journal for a specific date
 */
export function useJournal(date: string) {
  return useQuery({
    queryKey: journalKeys.date(date),
    queryFn: async (): Promise<JournalNote> => {
      return __request(OpenAPI, {
        method: 'GET',
        url: '/api/v1/notes/journals/{date}',
        path: {
          date,
        },
      });
    },
    enabled: !!date && /^\d{4}-\d{2}-\d{2}$/.test(date),
  });
}

/**
 * Update journal content
 */
export function useUpdateJournal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      noteId,
      content,
      title,
    }: {
      noteId: number;
      content?: Record<string, unknown>;
      title?: string;
    }) => {
      const updateData: NoteUpdate = {};
      if (content !== undefined) updateData.content = content;
      if (title !== undefined) updateData.title = title;
      
      return NotesService.updateNoteApiV1NotesNoteIdPut(noteId, updateData);
    },
    onSuccess: () => {
      // Invalidate the dates list
      queryClient.invalidateQueries({ queryKey: journalKeys.dates() });
      // Note: We'd need the journal_date from response to invalidate specific date query
    },
  });
}
