
import { Note } from '../domain/note.types';

// The Bridge is the only place that knows about both internal formats
// But strictly speaking, for Phase 1, it just passes blobs.

export const NoteDispatcher = {
  // Logic to determine which editor to use
  getEditorType: (note: Note) => {
    return note.type;
  }
};
