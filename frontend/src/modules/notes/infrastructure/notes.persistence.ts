
import { Note } from '../domain/note.types';

export interface PersistenceAdapter {
  save(note: Note): Promise<void>;
  load(id: string): Promise<Note | null>;
  delete(id: string): Promise<void>;
}

// "Dumb" persistence - just takes the note and saves it.
// Doesn't know if it's markdown or tldraw JSON.
export const LocalPersistence: PersistenceAdapter = {
  save: async (note: Note) => {
    console.log(`[Persistence] Saving note ${note.id} (${note.type})`);
    // In real app, this calls the API or local DB
  },
  load: async (id: string) => {
    console.log(`[Persistence] Loading note ${id}`);
    return null;
  },
  delete: async (id: string) => {
    console.log(`[Persistence] Deleting note ${id}`);
  }
};
