
import { Note } from '../../../domain/note.types';

export interface WhiteboardEditorProps {
  note: Note;
  onChange?: (content: unknown) => void;
  readOnly?: boolean;
}
