/**
 * NoteCard — individual note card for the hub grid view.
 */

import { useNavigate } from 'react-router-dom';
import { Star, Archive, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { NoteResponse } from '@/api/generated/models/NoteResponse';

interface NoteCardProps {
  note: NoteResponse;
  onDelete: (id: number) => void;
  onArchive: (id: number) => void;
  onToggleFavorite: (id: number, current: boolean) => void;
}

export function NoteCard({ note, onDelete, onArchive, onToggleFavorite }: NoteCardProps) {
  const navigate = useNavigate();
  const isCanvas = note.editor_version?.startsWith('excalidraw');
  const icon = isCanvas ? '🎨' : '📝';

  const preview = note.content_text
    ? note.content_text.slice(0, 120).trim()
    : isCanvas
    ? 'Whiteboard canvas'
    : 'Empty note';

  const timeAgo = formatDistanceToNow(new Date(note.updated_at), { addSuffix: true });

  return (
    <div
      className="note-card"
      onClick={() => navigate(`/notes/${note.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/notes/${note.id}`)}
    >
      <div className="note-card__header">
        <span className="note-card__icon">{icon}</span>
        <span className="note-card__title">{note.title || 'Untitled'}</span>
        <button
          className={`note-card__favorite-btn ${note.is_favorite ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(note.id, note.is_favorite);
          }}
          title={note.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star size={13} fill={note.is_favorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {preview && <p className="note-card__preview">{preview}</p>}

      <div className="note-card__footer">
        <span className="note-card__meta">{timeAgo}</span>
        <div className="note-card__actions">
          <button
            className="note-card__action-btn"
            onClick={(e) => { e.stopPropagation(); onArchive(note.id); }}
            title="Archive"
          >
            <Archive size={12} />
          </button>
          <button
            className="note-card__action-btn note-card__action-btn--danger"
            onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
