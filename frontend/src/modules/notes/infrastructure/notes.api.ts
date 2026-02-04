
import { Note, NoteCreateDTO, NoteUpdateDTO, NoteModel } from '../domain';

const STORAGE_KEY = 'synapse_notes_v1';

const getStore = (): Note[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const setStore = (notes: Note[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
};

export const NotesApi = {
  // GET /notes
  fetchAll: async (): Promise<Note[]> => {
    return getStore();
  },

  // GET /notes/:id
  fetchById: async (id: string): Promise<Note> => {
     const notes = getStore();
     const note = notes.find(n => n.id === id);
     if (!note) throw new Error("Note not found");
     return note;
  },

  // POST /notes
  create: async (dto: NoteCreateDTO): Promise<Note> => {
     const notes = getStore();
     const newNote = NoteModel.create(
        crypto.randomUUID(), 
        dto.title, 
        dto.type, 
        dto.content
     );
     notes.push(newNote);
     setStore(notes);
     return newNote;
  },

  // PATCH /notes/:id
  update: async (id: string, dto: NoteUpdateDTO): Promise<Note> => {
     const notes = getStore();
     const idx = notes.findIndex(n => n.id === id);
     if (idx === -1) throw new Error("Note not found");
     
     const existingNote = notes[idx]!;
     const updated: Note = { 
       ...existingNote, 
       title: dto.title ?? existingNote.title,
       content: dto.content ?? existingNote.content,
       updatedAt: new Date().toISOString(), 
     };
     notes[idx] = updated;
     setStore(notes);
     return updated;
  },

  // DELETE /notes/:id
  delete: async (id: string): Promise<void> => {
     const notes = getStore();
     const filtered = notes.filter(n => n.id !== id);
     setStore(filtered);
  }
};
