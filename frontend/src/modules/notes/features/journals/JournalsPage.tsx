/**
 * JournalsPage — daily journal entries navigator.
 *
 * Shows a calendar-style list of dates that have journal entries.
 * Clicking a date opens (or creates) the journal note for that day.
 * Today's journal opens automatically if the user navigates here
 * without a date selected.
 *
 * Route: /notes?view=journals
 * Backend: GET /api/v1/notes/journal/dates  → string[] (ISO dates)
 *          POST /api/v1/notes/journal/:date  → Note
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Loader2, CalendarDays } from 'lucide-react';
import { NotesRepository } from '../../infrastructure/notes.repository';
import { format, parseISO, isToday, isYesterday } from 'date-fns';

interface JournalDateEntry {
  date: string;         // ISO date string: "2026-04-27"
  label: string;        // "Today", "Yesterday", or "Apr 27, 2026"
  isToday: boolean;
}

function buildLabel(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
}

export function JournalsPage() {
  const navigate = useNavigate();
  const [dates, setDates] = useState<JournalDateEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null); // currently-opening date

  // Load all journal dates
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    NotesRepository.getJournalDates()
      .then((raw) => {
        if (cancelled) return;
        const sorted = [...raw]
          .sort((a, b) => b.date.localeCompare(a.date))  // newest first
          .map((item) => ({
            date: item.date,
            label: buildLabel(item.date),
            isToday: isToday(parseISO(item.date)),
          }));
        setDates(sorted);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Failed to load journals');
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const openDate = useCallback(
    async (iso: string) => {
      try {
        setOpening(iso);
        const note = await NotesRepository.getOrCreateJournal(iso);
        navigate(`/notes/${(note as any).id}`);
      } catch {
        setOpening(null);
      }
    },
    [navigate],
  );

  const openToday = useCallback(async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    await openDate(today);
  }, [openDate]);

  return (
    <div className="notes-hub">
      {/* Header */}
      <div className="notes-hub__header">
        <h1 className="notes-hub__title">Journals</h1>
        <button
          className="notes-sidebar__new-btn"
          onClick={openToday}
          style={{ flex: 'unset', padding: '7px 14px' }}
        >
          <Plus size={14} /> Today's Entry
        </button>
      </div>

      {/* Content */}
      {error ? (
        <div className="notes-hub__empty">
          <span className="notes-hub__empty-icon">⚠️</span>
          <p className="notes-hub__empty-title">Failed to load journals</p>
          <p className="notes-hub__empty-sub">{error}</p>
        </div>
      ) : isLoading ? (
        <div className="notes-hub__empty">
          <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--text-tertiary)' }} />
          <p className="notes-hub__empty-sub">Loading journals…</p>
        </div>
      ) : dates.length === 0 ? (
        <div className="notes-hub__empty">
          <span className="notes-hub__empty-icon">📔</span>
          <p className="notes-hub__empty-title">No journal entries yet</p>
          <p className="notes-hub__empty-sub">
            Start your first entry with "Today's Entry" above.
          </p>
        </div>
      ) : (
        <div className="journals-list">
          {dates.map((entry) => (
            <button
              key={entry.date}
              className={`journals-list__item ${entry.isToday ? 'journals-list__item--today' : ''}`}
              onClick={() => openDate(entry.date)}
              disabled={opening === entry.date}
            >
              <span className="journals-list__icon">
                {opening === entry.date
                  ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                  : entry.isToday
                  ? <CalendarDays size={16} />
                  : <BookOpen size={16} />}
              </span>
              <span className="journals-list__label">{entry.label}</span>
              <span className="journals-list__date">
                {format(parseISO(entry.date), 'EEE, MMM d')}
              </span>
              <span className="journals-list__arrow">→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
