
import { Note, NoteCreateDTO, NoteUpdateDTO } from '../domain/note.types';
import { NotesApi } from './notes.api';
import { LocalPersistence } from './notes.persistence';

// The Repository pattern acts as the single source of truth
// It coordinates between API (remote) and Persistence (local/optimistic)
export const NotesRepository = {
  getAllNotes: async () => {
    return NotesApi.fetchAll();
  },

  getNote: async (id: string) => {
    return NotesApi.fetchById(id);
  },

  createNote: async (dto: NoteCreateDTO) => {
    const note = await NotesApi.create(dto);
    await LocalPersistence.save(note);
    return note;
  },

  updateNote: async (id: string, updates: NoteUpdateDTO) => {
    // 1. Optimistic update (maybe)
    // 2. API call
    const updated = await NotesApi.update(id, updates);
    // 3. Sync local
    await LocalPersistence.save(updated);
    return updated;
  },

  deleteNote: async (id: string) => {
    await NotesApi.delete(id);
    await LocalPersistence.delete(id);
  }
};
