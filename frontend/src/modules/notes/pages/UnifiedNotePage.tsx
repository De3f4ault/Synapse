/**
 * UnifiedNotePage — the "Dual-Face" note session.
 *
 * One database record, two editor views:
 *   • Text face  → Tiptap rich-text editor
 *   • Canvas face → Excalidraw whiteboard
 *
 * The floating bottom bar lets the user switch between faces.
 * Both editors read from and write to the SAME note.id so the
 * AI has unified context regardless of which face is active.
 *
 * Route: /notes/:noteId
 * Falls back to a blank new note when noteId is "new".
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TiptapEditor } from '../features/text/editor/TiptapEditor';
import { ExcalidrawEditor } from '../features/whiteboard/editor/ExcalidrawEditor';
import { NotesRepository } from '../infrastructure/notes.repository';
import { useNoteVersions } from '../versions/hooks/useNoteVersions';
import { VersionHistory } from '../versions/components/VersionHistory';
import { useThemeStore } from '@/stores/themeStore';
import type { Note } from '../domain/note.types';
import {
  FileText, PenTool, Sun, Moon, History, MoreHorizontal,
  Star, Archive, ChevronLeft, X,
} from 'lucide-react';
import './unified-note.css';

type EditorFace = 'text' | 'canvas';

export function UnifiedNotePage() {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();

  const resolvedTheme =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;

  const [face, setFace] = useState<EditorFace>('text');
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const isMounted = useRef(true);

  // Version history — only fetched when the drawer is open
  const noteIdNum = note ? note.id : null;
  const { versions, isLoading: versionsLoading, restoreVersion, isRestoring } =
    useNoteVersions(showHistory ? noteIdNum : null);

  // Load or create note
  useEffect(() => {
    isMounted.current = true;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        if (!noteId || noteId === 'new') {
          // Create a fresh blank note
          const created = await NotesRepository.createNote({
            title: 'Untitled',
            content: {},
            editor_version: 'tiptap@2',
          });
          if (isMounted.current) {
            navigate(`/notes/${created.id}`, { replace: true });
          }
          return;
        }

        const data = await NotesRepository.getNote(Number(noteId));
        if (isMounted.current) {
          setNote(data as unknown as Note);
          // Infer face from editor_version
          const isCanvas = (data as any).editor_version?.startsWith('excalidraw');
          setFace(isCanvas ? 'canvas' : 'text');
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load note:', err);
        if (isMounted.current) {
          setError('Failed to load this note.');
          setLoading(false);
        }
      }
    };

    load();
    return () => { isMounted.current = false; };
  }, [noteId, navigate]);

  // Inline title save (debounced)
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleTitleChange = useCallback(
    (value: string) => {
      if (!note) return;
      if (titleTimer.current) clearTimeout(titleTimer.current);
      titleTimer.current = setTimeout(async () => {
        try {
          setIsSavingTitle(true);
          await NotesRepository.updateNote(note.id, { title: value });
          setNote((prev) => (prev ? { ...prev, title: value } : prev));
        } finally {
          if (isMounted.current) setIsSavingTitle(false);
        }
      }, 800);
    },
    [note],
  );

  const handleToggleFavorite = useCallback(async () => {
    if (!note) return;
    await NotesRepository.favoriteNote(note.id, !note.is_favorite);
    setNote((prev) => (prev ? { ...prev, is_favorite: !prev.is_favorite } : prev));
  }, [note]);

  const handleArchive = useCallback(async () => {
    if (!note) return;
    await NotesRepository.archiveNote(note.id);
    navigate('/notes');
  }, [note, navigate]);

  if (loading) {
    return (
      <div className="unified-note__loading">
        <div className="unified-note__loading-pulse" />
        <span>Opening note…</span>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="unified-note__loading">
        <span style={{ color: 'var(--status-error)' }}>⚠ {error ?? 'Note not found'}</span>
        <button
          onClick={() => navigate('/notes')}
          style={{
            marginTop: 12,
            padding: '6px 16px',
            borderRadius: 'var(--radius-default)',
            border: '1px solid var(--border-default)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          ← Back to notes
        </button>
      </div>
    );
  }

  return (
    <div className="unified-note">
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <header className="unified-note__topbar">
        <div className="unified-note__topbar-left">
          <button
            onClick={() => navigate('/notes')}
            className="unified-note__icon-btn"
            title="Back to notes"
          >
            <ChevronLeft size={16} />
          </button>

          <input
            ref={titleRef}
            className="unified-note__title-input"
            defaultValue={note.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Untitled"
            aria-label="Note title"
          />

          {isSavingTitle && (
            <span className="unified-note__save-indicator">saving…</span>
          )}
        </div>

        <div className="unified-note__topbar-right">
          <button
            onClick={handleToggleFavorite}
            className={`unified-note__icon-btn ${note.is_favorite ? 'active-star' : ''}`}
            title={note.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star size={15} fill={note.is_favorite ? 'currentColor' : 'none'} />
          </button>

          <button
            onClick={() => setShowHistory((h) => !h)}
            className={`unified-note__icon-btn ${showHistory ? 'active' : ''}`}
            title="Version history"
          >
            <History size={15} />
          </button>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu((m) => !m)}
              className="unified-note__icon-btn"
              title="More options"
            >
              <MoreHorizontal size={15} />
            </button>
            {showMenu && (
              <div className="unified-note__dropdown" onMouseLeave={() => setShowMenu(false)}>
                <button
                  className="unified-note__dropdown-item unified-note__dropdown-item--danger"
                  onClick={() => { setShowMenu(false); handleArchive(); }}
                >
                  <Archive size={13} /> Archive note
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Editor area ──────────────────────────────────────────── */}
      <div className="unified-note__body">
        {/* Text face — always mounted, hidden when canvas is active */}
        <div
          className="unified-note__face unified-note__face--text"
          style={{ display: face === 'text' ? 'flex' : 'none' }}
        >
          <div className="unified-note__tiptap-scroll">
            <div className="unified-note__tiptap-container">
              <TiptapEditor note={note} />
            </div>
          </div>
        </div>

        {/* Canvas face — only mounted when active (Excalidraw is heavy) */}
        {face === 'canvas' && (
          <div
            className="unified-note__face unified-note__face--canvas"
          >
            <ExcalidrawEditor note={note} noteText={note.content_text ?? ''} />
          </div>
        )}

        {/* ── Version History drawer (slide in from right) ── */}
        {showHistory && (
          <div className="unified-note__history-drawer">
            <div className="unified-note__history-header">
              <span className="unified-note__history-title">
                <History size={14} /> Version History
              </span>
              <button
                className="unified-note__icon-btn"
                onClick={() => setShowHistory(false)}
                title="Close"
              >
                <X size={14} />
              </button>
            </div>
            <div className="unified-note__history-body">
              {versionsLoading ? (
                <div className="unified-note__history-loading">Loading versions…</div>
              ) : (
                <VersionHistory
                  versions={versions}
                  onRestore={async (vn) => {
                    await restoreVersion(vn);
                    setShowHistory(false);
                    // Reload note to reflect restored content
                    const updated = await NotesRepository.getNote(note.id);
                    setNote(updated as unknown as Note);
                  }}
                  isRestoring={isRestoring}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Floating bottom bar ──────────────────────────────────── */}
      <div className="unified-note__bottom-bar">
        {/* Face switcher */}
        <div className="unified-note__face-switcher">
          <button
            onClick={() => setFace('text')}
            className={`unified-note__face-btn ${face === 'text' ? 'active' : ''}`}
            title="Text editor"
          >
            <FileText size={13} />
            <span>Text</span>
          </button>
          <button
            onClick={() => setFace('canvas')}
            className={`unified-note__face-btn ${face === 'canvas' ? 'active' : ''}`}
            title="Canvas"
          >
            <PenTool size={13} />
            <span>Canvas</span>
          </button>
        </div>

        <div className="unified-note__bottom-divider" />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="unified-note__icon-btn"
          title="Toggle theme"
          style={{ fontSize: '0.85rem' }}
        >
          {resolvedTheme === 'dark' ? <Moon size={13} /> : <Sun size={13} />}
        </button>
      </div>
    </div>
  );
}
