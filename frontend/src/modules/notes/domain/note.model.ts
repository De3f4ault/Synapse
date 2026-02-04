
import { Note, NoteType } from './note.types';

// Pure domain model behavior (if any needed in future)
// Currently serves as the canonical factory/utility namespace
export const NoteModel = {
  create: (
    id: string, 
    title: string, 
    type: NoteType, 
    content: unknown = null
  ): Note => ({
    id,
    title,
    type,
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
};
