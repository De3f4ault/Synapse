
import { Note } from '../../domain/note.types';

export interface BlockNoteEditorProps {
  note: Note;
  onChange?: (content: unknown) => void;
  readOnly?: boolean;
  theme?: 'light' | 'dark';
}
