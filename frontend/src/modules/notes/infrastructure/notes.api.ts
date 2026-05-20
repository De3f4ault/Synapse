
import { NotesService } from '@/api/generated/services/NotesService';
import type { NoteResponse } from '@/api/generated/models/NoteResponse';
import type { NoteUpdate } from '@/api/generated/models/NoteUpdate';
import type { NoteCreate } from '@/api/generated/models/NoteCreate';

/**
 * Direct HTTP delegates over the generated NotesService client.
 * No localStorage. No queue. Every call goes straight to the backend.
 */

async function getAuthHeaders(): Promise<{ token: string; baseUrl: string }> {
  const { OpenAPI } = await import('@/api/generated/core/OpenAPI');
  const token =
    typeof OpenAPI.TOKEN === 'function' ? await (OpenAPI.TOKEN as any)('') : OpenAPI.TOKEN;
  const baseUrl = (OpenAPI.BASE ?? '').replace(/\/$/, '');
  return { token, baseUrl };
}

export const NotesApi = {
  // ── CRUD ──────────────────────────────────────────────────────────────────

  fetchAll: async (params?: {
    is_favorite?: boolean;
    is_archived?: boolean;
    parent_id?: number;
  }): Promise<NoteResponse[]> => {
    return NotesService.listNotesApiV1NotesGet(
      params?.parent_id,
      undefined,
      params?.is_favorite,
      params?.is_archived,
    );
  },

  fetchById: async (id: number): Promise<NoteResponse> => {
    return NotesService.getNoteApiV1NotesNoteIdGet(id);
  },

  create: async (dto: {
    title: string;
    content?: unknown;
    content_text?: string;
    editor_version?: string;
    parent_id?: number | null;
  }): Promise<NoteResponse> => {
    const body: NoteCreate = {
      title: dto.title,
      content: (dto.content ?? {}) as any,
      content_text: dto.content_text,
      editor_version: dto.editor_version,
      format: 'plain',
      tags: [],
      parent_id: dto.parent_id ?? undefined,
    };
    return NotesService.createNoteApiV1NotesPost(body);
  },

  update: async (id: number, dto: Record<string, unknown>): Promise<NoteResponse> => {
    return NotesService.updateNoteApiV1NotesNoteIdPut(id, dto as NoteUpdate);
  },

  checkpoint: async (id: number): Promise<NoteResponse> => {
    const { token, baseUrl } = await getAuthHeaders();
    const resp = await fetch(`${baseUrl}/api/v1/notes/${id}/checkpoint`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!resp.ok) throw new Error(`Checkpoint failed: ${resp.status}`);
    return resp.json();
  },

  delete: async (id: number): Promise<void> => {
    await NotesService.deleteNoteApiV1NotesNoteIdDelete(id);
  },

  // ── Discovery ─────────────────────────────────────────────────────────────

  /** GET /notes/search?query=... */
  search: async (query: string, limit = 20): Promise<NoteResponse[]> => {
    const { token, baseUrl } = await getAuthHeaders();
    const resp = await fetch(
      `${baseUrl}/api/v1/notes/search?query=${encodeURIComponent(query)}&limit=${limit}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!resp.ok) throw new Error(`Search failed: ${resp.status}`);
    return resp.json();
  },

  /** GET /notes/tree */
  getTree: async (): Promise<NoteResponse[]> => {
    const { token, baseUrl } = await getAuthHeaders();
    const resp = await fetch(`${baseUrl}/api/v1/notes/tree`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`Tree fetch failed: ${resp.status}`);
    return resp.json();
  },

  // ── Journals ──────────────────────────────────────────────────────────────

  /** GET /notes/journals/dates */
  getJournalDates: async (): Promise<{ date: string; note_id: number; title: string }[]> => {
    const { token, baseUrl } = await getAuthHeaders();
    const resp = await fetch(`${baseUrl}/api/v1/notes/journals/dates`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`Journal dates fetch failed: ${resp.status}`);
    return resp.json();
  },

  /** GET /notes/journals/:date — creates the journal if not found */
  getOrCreateJournal: async (date: string): Promise<NoteResponse> => {
    const { token, baseUrl } = await getAuthHeaders();
    const resp = await fetch(`${baseUrl}/api/v1/notes/journals/${date}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`Journal fetch failed: ${resp.status}`);
    return resp.json();
  },

  // ── Versions ──────────────────────────────────────────────────────────────

  /** GET /notes/:id/versions */
  getVersions: async (id: number): Promise<any[]> => {
    const { token, baseUrl } = await getAuthHeaders();
    const resp = await fetch(`${baseUrl}/api/v1/notes/${id}/versions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`Versions fetch failed: ${resp.status}`);
    return resp.json();
  },

  // ── Notes AI (SSE transform + JSON visualize) ─────────────────────────────

  /**
   * Streams a text transformation for the Tiptap AI bubble menu.
   * Returns a ReadableStream<Uint8Array> — the caller reads SSE events from it.
   *
   * SSE event shapes:
   *   { type: 'start', action: string }
   *   { type: 'token', text: string }
   *   { type: 'done' }
   *   { type: 'error', message: string }
   */
  streamTransform: async (params: {
    action: string;
    selected_text: string;
    custom_prompt?: string;
    language?: string;
    tone?: string;
    unified_context?: { text?: string; canvas_summary?: string };
  }): Promise<ReadableStream<Uint8Array>> => {
    const { token, baseUrl } = await getAuthHeaders();
    const resp = await fetch(`${baseUrl}/api/v1/notes/ai/transform`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, unified_context: params.unified_context ?? {} }),
    });
    if (!resp.ok) throw new Error(`Transform stream failed: ${resp.status}`);
    if (!resp.body) throw new Error('No response body');
    return resp.body;
  },

  /**
   * Requests a Mermaid diagram from the Excalidraw AI input.
   * Returns { mermaid: string, diagram_type: string }
   */
  visualize: async (params: {
    prompt: string;
    diagram_type?: string;
    unified_context?: { text?: string; canvas_summary?: string };
  }): Promise<{ mermaid: string; diagram_type: string }> => {
    const { token, baseUrl } = await getAuthHeaders();
    const resp = await fetch(`${baseUrl}/api/v1/notes/ai/visualize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        diagram_type: 'flowchart',
        ...params,
        unified_context: params.unified_context ?? {},
      }),
    });
    if (!resp.ok) throw new Error(`Visualize failed: ${resp.status}`);
    return resp.json();
  },
};
