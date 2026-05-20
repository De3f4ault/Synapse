/**
 * NotesSearchDialog — ⌘K command-palette style search over all notes.
 *
 * Features:
 * - Debounced live search against the backend /notes/search endpoint
 * - Keyboard navigation (↑ ↓ Enter Escape)
 * - Closes on overlay click or Escape
 * - Falls back to recent notes when query is empty
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { NotesRepository } from '../../infrastructure/notes.repository';
import type { NoteResponse } from '@/api/generated/models/NoteResponse';

interface NotesSearchDialogProps {
  onClose: () => void;
  onSelect: (id: number) => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export function NotesSearchDialog({ onClose, onSelect }: NotesSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NoteResponse[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 280);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load recent notes initially
  useEffect(() => {
    NotesRepository.getAllNotes().then((notes) => {
      setResults(
        (notes as unknown as NoteResponse[])
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          .slice(0, 10),
      );
    });
  }, []);

  // Search on query change
  useEffect(() => {
    if (!debouncedQuery.trim()) return;
    let cancelled = false;
    setIsSearching(true);
    NotesRepository.searchNotes(debouncedQuery, 15).then((data) => {
      if (cancelled) return;
      setResults(data as unknown as NoteResponse[]);
      setFocusedIndex(0);
      setIsSearching(false);
    }).catch(() => {
      if (!cancelled) setIsSearching(false);
    });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Reset focus index when query clears
  useEffect(() => {
    if (!query) setFocusedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, results.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && results[focusedIndex]) {
        onSelect(results[focusedIndex].id);
      }
    },
    [results, focusedIndex, onClose, onSelect],
  );

  return (
    <div
      className="notes-search-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search notes"
    >
      <div
        className="notes-search-dialog"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Input */}
        <div className="notes-search-input-wrap">
          {isSearching ? (
            <Loader2 size={16} style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }} />
          ) : (
            <Search size={16} style={{ flexShrink: 0 }} />
          )}
          <input
            ref={inputRef}
            className="notes-search-input"
            placeholder="Search notes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-tertiary)',
                fontSize: '0.75rem',
                padding: '0 4px',
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Results */}
        <div className="notes-search-results" role="listbox">
          {results.length === 0 && !isSearching ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-caption)' }}>
              {query ? 'No results found' : 'No notes yet'}
            </div>
          ) : (
            results.map((note, idx) => {
              const isCanvas = note.editor_version?.startsWith('excalidraw');
              return (
                <button
                  key={note.id}
                  className={`notes-search-item ${idx === focusedIndex ? 'focused' : ''}`}
                  onClick={() => onSelect(note.id)}
                  onMouseEnter={() => setFocusedIndex(idx)}
                  role="option"
                  aria-selected={idx === focusedIndex}
                >
                  <span className="notes-search-item__icon">{isCanvas ? '🎨' : '📝'}</span>
                  <div className="notes-search-item__body">
                    <div className="notes-search-item__title">{note.title || 'Untitled'}</div>
                    {note.content_text && (
                      <div className="notes-search-item__preview">
                        {note.content_text.slice(0, 80)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer hints */}
        <div className="notes-search-footer">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
  );
}
