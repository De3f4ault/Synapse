
import { NoteType } from '../domain/note.types';

export function NoteTypeBadge({ type }: { type: NoteType }) {
  const isText = type === 'text';
  return (
    <span className={`
      px-2 py-0.5 text-xs font-medium rounded-md border
      ${isText 
        ? 'bg-info/10 text-info border-blue-500/20' 
        : 'bg-accent/10 text-accent border-accent/20'}
    `}>
      {isText ? 'TEXT' : 'CANVAS'}
    </span>
  );
}
