/**
 * NotesLayout — root layout wrapper for the entire /notes section.
 *
 * Renders the two-panel layout:
 *   [NotesSidebar] | [<Outlet />]
 *
 * It also handles "New Note" creation so any child can trigger it via the
 * sidebar without duplicating logic.
 */

import { useState, useCallback, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { NotesSidebar } from './NotesSidebar';
import { useNotesList } from '../features/hub/hooks/useNotesList';
import { NotesRepository } from '../infrastructure/notes.repository';
import { NotesSearchDialog } from '../features/search/NotesSearchDialog';
import './notes.layout.css';

export function NotesLayout() {
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();

  // ⌘K / Ctrl+K opens search anywhere in notes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Fetch recent notes for the sidebar
  const { notes, refresh } = useNotesList('all');


  const handleNewNote = useCallback(
    async (type: 'text' | 'whiteboard') => {
      try {
        const note = await NotesRepository.createNote({
          title: type === 'text' ? 'Untitled Note' : 'Untitled Canvas',
          content: {},
          editor_version: type === 'text' ? 'tiptap@2' : 'excalidraw@0',
        });
        refresh();
        navigate(`/notes/${note.id}`);
      } catch (err) {
        console.error('Failed to create note', err);
      }
    },
    [navigate, refresh],
  );

  return (
    <div className="notes-layout">
      <NotesSidebar
        recentNotes={notes}
        onNewNote={handleNewNote}
        onSearchOpen={() => setSearchOpen(true)}
      />

      <main className="notes-layout__main">
        <Outlet />
      </main>

      {searchOpen && (
        <NotesSearchDialog
          onClose={() => setSearchOpen(false)}
          onSelect={(id) => {
            setSearchOpen(false);
            navigate(`/notes/${id}`);
          }}
        />
      )}
    </div>
  );
}
