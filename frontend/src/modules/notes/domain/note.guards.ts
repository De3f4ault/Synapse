
import { Note, NoteType } from './note.types';

export const isNote = (data: unknown): data is Note => {
  if (!data || typeof data !== 'object') return false;
  const note = data as Note;
  return (
    typeof note.id === 'string' &&
    typeof note.title === 'string' &&
    (note.type === 'text' || note.type === 'whiteboard')
  );
};

export const isNoteType = (type: string): type is NoteType => {
  return type === 'text' || type === 'whiteboard';
};
