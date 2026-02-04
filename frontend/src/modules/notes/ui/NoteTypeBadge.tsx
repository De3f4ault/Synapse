
import { NoteType } from '../domain/note.types';

export function NoteTypeBadge({ type }: { type: NoteType }) {
  const isText = type === 'text';
  return (
    <span className={`
      px-2 py-0.5 text-xs font-medium rounded-md border
      ${isText 
        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
        : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}
    `}>
      {isText ? 'TEXT' : 'CANVAS'}
    </span>
  );
}
