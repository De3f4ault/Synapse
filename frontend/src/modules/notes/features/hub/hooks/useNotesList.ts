
import { useEffect, useState, useCallback } from 'react';
import { NotesRepository } from '../../../infrastructure/notes.repository';
import type { NoteResponse } from '@/api/generated/models/NoteResponse';

export type NotesFilter = 'all' | 'favorites' | 'archived' | 'text' | 'whiteboard';

export function useNotesList(filter: NotesFilter = 'all') {
  const [notes, setNotes] = useState<NoteResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params: { is_favorite?: boolean; is_archived?: boolean } = {};

      if (filter === 'favorites') params.is_favorite = true;
      if (filter === 'archived') params.is_archived = true;

      const data = await NotesRepository.getAllNotes(params);
      // Client-side type filter
      const filtered =
        filter === 'text'
          ? data.filter((n: any) => n.editor_version?.startsWith('tiptap'))
          : filter === 'whiteboard'
          ? data.filter((n: any) => n.editor_version?.startsWith('excalidraw'))
          : data;

      setNotes(filtered as NoteResponse[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createNote = useCallback(
    async (dto: { title: string; content?: unknown; editor_version?: string }) => {
      const newNote = await NotesRepository.createNote({
        title: dto.title,
        content: dto.content,
        editor_version: dto.editor_version,
      });
      setNotes((prev) => [newNote as unknown as NoteResponse, ...prev]);
      return newNote;
    },
    [],
  );

  const deleteNote = useCallback(async (id: number) => {
    await NotesRepository.deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const archiveNote = useCallback(async (id: number, archive = true) => {
    await NotesRepository.archiveNote(id, archive);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const toggleFavorite = useCallback(async (id: number, current: boolean) => {
    const updated = await NotesRepository.favoriteNote(id, !current);
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_favorite: !current } : n)),
    );
    return updated;
  }, []);

  return {
    notes,
    isLoading,
    error,
    createNote,
    deleteNote,
    archiveNote,
    toggleFavorite,
    refresh: fetchNotes,
  };
}
