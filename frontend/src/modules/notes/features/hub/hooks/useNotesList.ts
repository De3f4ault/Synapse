
import { useEffect, useState, useCallback } from "react";
import { Note, NoteCreateDTO } from "../../../domain/note.types";
import { NotesRepository } from "../../../infrastructure/notes.repository";

export function useNotesList() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await NotesRepository.getAllNotes();
      setNotes(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const createNote = useCallback(async (dto: NoteCreateDTO) => {
    try {
      const newNote = await NotesRepository.createNote(dto);
      setNotes(prev => [newNote, ...prev]);
      return newNote;
    } catch (err) {
      console.error("Failed to create note", err);
      throw err;
    }
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    try {
        await NotesRepository.deleteNote(id);
        setNotes(prev => prev.filter(n => n.id !== id));
    } catch (err) {
        console.error("Failed to delete note", err);
        throw err;
    }
  }, []);

  return {
    notes,
    isLoading,
    error,
    createNote,
    deleteNote,
    refresh: fetchNotes
  };
}
