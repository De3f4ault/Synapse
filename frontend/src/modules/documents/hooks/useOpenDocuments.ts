/**
 * useOpenDocuments — Zustand store for multi-tab document editing
 *
 * Exact port of Paperless-ngx open-documents.service.ts (183 lines):
 *   - MAX_OPEN_DOCUMENTS = 5
 *   - sessionStorage persistence (survives page refresh)
 *   - Dirty tracking with changed-fields list
 *   - FIFO eviction when opening 6th document
 *   - Unsaved changes warning flow
 *
 * Key differences from Paperless source:
 *   - Uses Zustand instead of Angular @Injectable service
 *   - Uses sessionStorage API directly (same as Paperless)
 *   - Returns `needsConfirmation` flag instead of opening modal directly
 *     (the component layer handles the confirmation dialog)
 */

import { create } from "zustand";

// ============================================================================
// Types
// ============================================================================

/** Minimal document shape needed for tabs (not full DocumentResponse) */
export interface OpenDoc {
  id: number;
  filename: string;
  title?: string;
}

interface OpenDocumentsState {
  /** Currently open documents, max 5, newest at index 0 (matching Paperless FIFO) */
  openDocs: OpenDoc[];
  /** Set of document IDs with unsaved changes */
  dirtyDocs: Set<number>;
  /** Map of docId → list of field names that were changed */
  changedFields: Map<number, string[]>;

  // Actions
  openDocument: (doc: OpenDoc) => { opened: boolean; evictedDoc?: OpenDoc };
  closeDocument: (docId: number) => { closed: boolean; needsConfirmation: boolean; dirtyDoc?: OpenDoc };
  closeAll: () => { closed: boolean; needsConfirmation: boolean; dirtyCount: number };
  forceClose: (docId: number) => void;
  forceCloseAll: () => void;
  setDirty: (docId: number, fields: string[]) => void;
  clearDirty: (docId: number) => void;
  hasDirty: () => boolean;
  isDirty: (docId: number) => boolean;
  refreshDocument: (docId: number, updated: OpenDoc) => void;
  getActiveDoc: (docId: number) => OpenDoc | undefined;
}

// ============================================================================
// SessionStorage persistence (matching Paperless OPEN_DOCUMENT_SERVICE key)
// ============================================================================

const STORAGE_KEY = "synapse_open_documents";

function loadFromSession(): OpenDoc[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
  }
  return [];
}

function saveToSession(docs: OpenDoc[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  } catch (e) {
    console.error("Error saving open documents to session storage", e);
  }
}

// ============================================================================
// Store
// ============================================================================

const MAX_OPEN_DOCUMENTS = 5;

export const useOpenDocuments = create<OpenDocumentsState>((set, get) => ({
  openDocs: loadFromSession(),
  dirtyDocs: new Set(),
  changedFields: new Map(),

  openDocument: (doc: OpenDoc) => {
    const state = get();

    // Already open — no-op
    if (state.openDocs.find((d) => d.id === doc.id)) {
      return { opened: true };
    }

    // At max capacity — evict oldest (last in array, Paperless L67)
    if (state.openDocs.length >= MAX_OPEN_DOCUMENTS) {
      const evictedDoc = state.openDocs[state.openDocs.length - 1];

      // If oldest is dirty, caller needs to show confirmation
      if (state.dirtyDocs.has(evictedDoc.id)) {
        return { opened: false, evictedDoc };
      }

      // Remove oldest, add new at front
      const updated = [doc, ...state.openDocs.slice(0, -1)];
      set({ openDocs: updated });
      saveToSession(updated);
      return { opened: true, evictedDoc };
    }

    // Under max — just prepend (Paperless finishOpenDocument: unshift)
    const updated = [doc, ...state.openDocs];
    set((s) => {
      s.dirtyDocs.delete(doc.id);
      return { openDocs: updated, dirtyDocs: new Set(s.dirtyDocs) };
    });
    saveToSession(updated);
    return { opened: true };
  },

  closeDocument: (docId: number) => {
    const state = get();
    const index = state.openDocs.findIndex((d) => d.id === docId);
    if (index === -1) return { closed: true, needsConfirmation: false };

    // If dirty, don't close — return confirmation flag (Paperless L114-141)
    if (state.dirtyDocs.has(docId)) {
      return {
        closed: false,
        needsConfirmation: true,
        dirtyDoc: state.openDocs[index],
      };
    }

    // Not dirty — close immediately
    const updated = state.openDocs.filter((d) => d.id !== docId);
    set({ openDocs: updated });
    saveToSession(updated);
    return { closed: true, needsConfirmation: false };
  },

  closeAll: () => {
    const state = get();
    if (state.dirtyDocs.size > 0) {
      return {
        closed: false,
        needsConfirmation: true,
        dirtyCount: state.dirtyDocs.size,
      };
    }
    set({ openDocs: [], dirtyDocs: new Set(), changedFields: new Map() });
    saveToSession([]);
    return { closed: true, needsConfirmation: false, dirtyCount: 0 };
  },

  forceClose: (docId: number) => {
    set((state) => {
      const updated = state.openDocs.filter((d) => d.id !== docId);
      const dirty = new Set(state.dirtyDocs);
      dirty.delete(docId);
      const fields = new Map(state.changedFields);
      fields.delete(docId);
      saveToSession(updated);
      return { openDocs: updated, dirtyDocs: dirty, changedFields: fields };
    });
  },

  forceCloseAll: () => {
    set({ openDocs: [], dirtyDocs: new Set(), changedFields: new Map() });
    saveToSession([]);
  },

  // Paperless setDirty (L87-101): tracks dirty state + changed field names
  setDirty: (docId: number, fields: string[]) => {
    set((state) => {
      const dirty = new Set(state.dirtyDocs);
      dirty.add(docId);
      const changedFields = new Map(state.changedFields);
      changedFields.set(docId, fields.filter((k) => k !== "id"));
      return { dirtyDocs: dirty, changedFields };
    });
  },

  clearDirty: (docId: number) => {
    set((state) => {
      const dirty = new Set(state.dirtyDocs);
      dirty.delete(docId);
      const changedFields = new Map(state.changedFields);
      changedFields.set(docId, []);
      return { dirtyDocs: dirty, changedFields };
    });
  },

  hasDirty: () => get().dirtyDocs.size > 0,

  isDirty: (docId: number) => get().dirtyDocs.has(docId),

  // Paperless refreshDocument (L39-53): re-fetches and updates in-place
  refreshDocument: (docId: number, updated: OpenDoc) => {
    set((state) => {
      const index = state.openDocs.findIndex((d) => d.id === docId);
      if (index === -1) return state;
      const docs = [...state.openDocs];
      docs[index] = updated;
      saveToSession(docs);
      return { openDocs: docs };
    });
  },

  getActiveDoc: (docId: number) => {
    return get().openDocs.find((d) => d.id === docId);
  },
}));
