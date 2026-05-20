/**
 * NotesSidebar — collapsible left navigation panel for the Notes module.
 *
 * Sections:
 *   Smart Views : All Notes, Favorites, Archived, Journals
 *   Recent      : last 8 notes sorted by updated_at
 *
 * Props:
 *   selected    — current active view/note
 *   onSelect    — callback when an item is clicked
 *   onNewNote   — callback for the New Note CTA
 */

import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FileText, Star, Archive, BookOpen, ChevronLeft, ChevronRight,
  Plus, Clock, Search,
} from 'lucide-react';
import type { NoteResponse } from '@/api/generated/models/NoteResponse';
import { formatDistanceToNow } from 'date-fns';

interface NotesSidebarProps {
  recentNotes: NoteResponse[];
  onNewNote: (type: 'text' | 'whiteboard') => void;
  onSearchOpen: () => void;
}

type SmartView = 'all' | 'favorites' | 'archived' | 'journals';

const SMART_VIEWS: { id: SmartView; label: string; icon: React.ReactNode }[] = [
  { id: 'all',       label: 'All Notes',  icon: <FileText  size={15} /> },
  { id: 'favorites', label: 'Favorites',  icon: <Star      size={15} /> },
  { id: 'archived',  label: 'Archived',   icon: <Archive   size={15} /> },
  { id: 'journals',  label: 'Journals',   icon: <BookOpen  size={15} /> },
];

export function NotesSidebar({ recentNotes, onNewNote, onSearchOpen }: NotesSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;
  const currentView = new URLSearchParams(location.search).get('view') as SmartView | null;

  const goToView = useCallback((view: SmartView) => {
    if (view === 'journals') {
      navigate('/notes/journals');
    } else if (view === 'all') {
      navigate('/notes');
    } else {
      navigate(`/notes?view=${view}`);
    }
  }, [navigate]);

  const goToNote = useCallback((id: number) => {
    navigate(`/notes/${id}`);
  }, [navigate]);

  if (collapsed) {
    return (
      <aside className="notes-sidebar notes-sidebar--collapsed">
        <button
          onClick={() => setCollapsed(false)}
          className="notes-sidebar__collapse-btn"
          title="Expand sidebar"
        >
          <ChevronRight size={16} />
        </button>
        <div className="notes-sidebar__collapsed-icons">
          {SMART_VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => goToView(v.id)}
              className={`notes-sidebar__icon-btn ${currentView === v.id ? 'active' : ''}`}
              title={v.label}
            >
              {v.icon}
            </button>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="notes-sidebar">
      {/* Header */}
      <div className="notes-sidebar__header">
        <span className="notes-sidebar__title">Notes</span>
        <div className="notes-sidebar__header-actions">
          <button onClick={onSearchOpen} className="notes-sidebar__icon-btn" title="Search (⌘K)">
            <Search size={14} />
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="notes-sidebar__icon-btn"
            title="Collapse sidebar"
          >
            <ChevronLeft size={14} />
          </button>
        </div>
      </div>

      {/* Smart Views */}
      <nav className="notes-sidebar__section">
        <p className="notes-sidebar__section-label">Library</p>
        {SMART_VIEWS.map((v) => {
          const isActive =
            (v.id === 'journals' && currentPath === '/notes/journals') ||
            (v.id !== 'journals' && (
              (currentView === v.id) ||
              (!currentView && v.id === 'all' && currentPath === '/notes')
            ));
          return (
            <button
              key={v.id}
              onClick={() => goToView(v.id)}
              className={`notes-sidebar__nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="notes-sidebar__nav-icon">{v.icon}</span>
              <span>{v.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Recent */}
      {recentNotes.length > 0 && (
        <nav className="notes-sidebar__section">
          <p className="notes-sidebar__section-label">
            <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
            Recent
          </p>
          {recentNotes.slice(0, 8).map((note) => (
            <button
              key={note.id}
              onClick={() => goToNote(note.id)}
              className={`notes-sidebar__nav-item ${
                currentPath === `/notes/${note.id}` ? 'active' : ''
              }`}
              title={note.title}
            >
              <span className="notes-sidebar__nav-icon">
                {note.editor_version?.startsWith('excalidraw') ? '🎨' : '📝'}
              </span>
              <span className="notes-sidebar__nav-label">{note.title}</span>
              <span className="notes-sidebar__nav-meta">
                {formatDistanceToNow(new Date(note.updated_at), { addSuffix: false })}
              </span>
            </button>
          ))}
        </nav>
      )}

      {/* Footer CTA */}
      <div className="notes-sidebar__footer">
        <button onClick={() => onNewNote('text')} className="notes-sidebar__new-btn">
          <Plus size={14} />
          <span>New Note</span>
        </button>
        <button
          onClick={() => onNewNote('whiteboard')}
          className="notes-sidebar__new-btn notes-sidebar__new-btn--canvas"
          title="New Canvas"
        >
          🎨
        </button>
      </div>
    </aside>
  );
}
