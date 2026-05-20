
import { NotesApi } from './notes.api';
import type { NoteCreateDTO, NoteUpdateDTO } from '../domain/note.types';

/**
 * Single entry point for all note operations.
 * Delegates directly to the HTTP API — no local persistence layer.
 */
export const NotesRepository = {
  // ── CRUD ──────────────────────────────────────────────────────────────────
  getAllNotes: (params?: { is_favorite?: boolean; is_archived?: boolean; parent_id?: number }) =>
    NotesApi.fetchAll(params),

  getNote: (id: number) => NotesApi.fetchById(id),

  createNote: (dto: NoteCreateDTO) => NotesApi.create(dto),

  updateNote: (id: number, dto: NoteUpdateDTO) =>
    NotesApi.update(id, dto as Record<string, unknown>),

  checkpointNote: (id: number) => NotesApi.checkpoint(id),

  deleteNote: (id: number) => NotesApi.delete(id),

  archiveNote: (id: number, archive = true) =>
    NotesApi.update(id, { is_archived: archive }),

  favoriteNote: (id: number, favorite: boolean) =>
    NotesApi.update(id, { is_favorite: favorite }),

  // ── Discovery ─────────────────────────────────────────────────────────────
  searchNotes: (query: string, limit?: number) => NotesApi.search(query, limit),

  getNoteTree: () => NotesApi.getTree(),

  // ── Journals ──────────────────────────────────────────────────────────────
  getJournalDates: () => NotesApi.getJournalDates(),

  getOrCreateJournal: (date: string) => NotesApi.getOrCreateJournal(date),

  // ── Versions ──────────────────────────────────────────────────────────────
  getNoteVersions: (id: number) => NotesApi.getVersions(id),

  // ── AI ────────────────────────────────────────────────────────────────────
  streamTransform: (params: Parameters<typeof NotesApi.streamTransform>[0]) =>
    NotesApi.streamTransform(params),

  visualize: (params: Parameters<typeof NotesApi.visualize>[0]) =>
    NotesApi.visualize(params),
};
