/**
 * NotesHubPage — the "home" view of the Notes module.
 *
 * Renders the note grid filtered by the `?view=` query param
 * that the sidebar sets (all | favorites | archived | journals).
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useNotesList, type NotesFilter } from '../hooks/useNotesList';
import { NoteCard } from '../components/NoteCard';
import { NotesRepository } from '../../../infrastructure/notes.repository';
import { useCallback } from 'react';

const VIEW_LABELS: Record<string, string> = {
  all: 'All Notes',
  favorites: 'Favorites',
  archived: 'Archived',
  journals: 'Journals',
  text: 'Text Notes',
  whiteboard: 'Canvases',
};

const FILTERS: { id: NotesFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'archived', label: 'Archived' },
  { id: 'text', label: 'Text' },
  { id: 'whiteboard', label: 'Canvas' },
];

export function NotesHubPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const view = (params.get('view') ?? 'all') as NotesFilter;

  const { notes, isLoading, error, deleteNote, archiveNote, toggleFavorite, refresh } =
    useNotesList(view);

  const handleNewNote = useCallback(
    async (type: 'text' | 'whiteboard' = 'text') => {
      const note = await NotesRepository.createNote({
        title: type === 'text' ? 'Untitled Note' : 'Untitled Canvas',
        content: {},
        editor_version: type === 'text' ? 'tiptap@2' : 'excalidraw@0',
      });
      refresh();
      navigate(`/notes/${note.id}`);
    },
    [navigate, refresh],
  );

  const setFilter = (f: NotesFilter) => navigate(`/notes?view=${f}`);

  return (
    <div className="notes-hub">
      {/* Header */}
      <div className="notes-hub__header">
        <h1 className="notes-hub__title">{VIEW_LABELS[view] ?? 'Notes'}</h1>
        <div className="notes-hub__actions">
          <button
            className="notes-sidebar__new-btn"
            onClick={() => handleNewNote('whiteboard')}
            style={{ flex: 'unset', padding: '7px 12px' }}
          >
            🎨 New Canvas
          </button>
          <button
            className="notes-sidebar__new-btn"
            onClick={() => handleNewNote('text')}
            style={{ flex: 'unset', padding: '7px 12px' }}
          >
            <Plus size={14} /> New Note
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="notes-hub__filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`notes-hub__filter-btn ${view === f.id ? 'active' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {error ? (
        <div className="notes-hub__empty">
          <span className="notes-hub__empty-icon">⚠️</span>
          <p className="notes-hub__empty-title">Failed to load notes</p>
          <p className="notes-hub__empty-sub">{error}</p>
        </div>
      ) : isLoading ? (
        <div className="notes-hub__grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="note-card" style={{ opacity: 0.4, animation: 'pulse 1.5s infinite' }}>
              <div style={{ height: 16, background: 'var(--bg-surface-hover)', borderRadius: 4, width: '60%' }} />
              <div style={{ height: 12, background: 'var(--bg-surface-hover)', borderRadius: 4, width: '90%' }} />
              <div style={{ height: 12, background: 'var(--bg-surface-hover)', borderRadius: 4, width: '75%' }} />
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="notes-hub__empty">
          <span className="notes-hub__empty-icon">
            {view === 'favorites' ? '⭐' : view === 'archived' ? '🗃️' : '📝'}
          </span>
          <p className="notes-hub__empty-title">
            {view === 'favorites'
              ? 'No favorites yet'
              : view === 'archived'
              ? 'Archive is empty'
              : 'No notes yet'}
          </p>
          <p className="notes-hub__empty-sub">
            {view === 'all'
              ? 'Create your first note using the button above.'
              : view === 'favorites'
              ? 'Star a note to see it here.'
              : 'Archived notes will appear here.'}
          </p>
        </div>
      ) : (
        <div className="notes-hub__grid">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onDelete={deleteNote}
              onArchive={archiveNote}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}
