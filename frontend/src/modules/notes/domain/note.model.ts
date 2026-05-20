
import { Note, NoteType } from './note.types';

// Pure domain model behavior
// Factory now produces objects matching the backend schema
export const NoteModel = {
  create: (
    id: number,
    title: string,
    type: NoteType,
    content: unknown = {}
  ): Note => ({
    id,
    title,
    type,
    content,
    content_text: '',
    editor_version: type === 'text' ? 'tiptap@2' : 'excalidraw@0',
    parent_id: null,
    journal_date: null,
    is_favorite: false,
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }),
};
