/**
 * Document Store - Single Source of Truth for Active Document
 *
 * INVARIANT:
 * This store is the sole authority for which document is active.
 * Viewer module may read but MUST NOT mutate lifecycle state.
 *
 * Key invariants:
 * - Only one document can be "active" at a time
 * - Active document is set explicitly, not derived
 * - Error state is cleared on new selection
 */

import { create } from "zustand";
import {
    DocumentCoreState,
    EnhancedDocument,
    INITIAL_CORE_STATE,
} from "../engine/types";

interface DocumentStoreState extends DocumentCoreState {
    // Actions
    setActiveDocument: (document: EnhancedDocument) => void;
    setActiveDocumentById: (id: number) => void;
    clearActiveDocument: () => void;
    setError: (error: string | null) => void;
    clearError: () => void;
    reset: () => void;
}

export const useDocumentStore = create<DocumentStoreState>((set) => ({
    // Initial state
    ...INITIAL_CORE_STATE,

    // Set active document with full data
    setActiveDocument: (document) =>
        set({
            activeDocumentId: document.id,
            activeDocument: document,
            error: null,
        }),

    // Set active document by ID only (document data fetched separately)
    setActiveDocumentById: (id) =>
        set({
            activeDocumentId: id,
            error: null,
        }),

    // Clear active document
    clearActiveDocument: () =>
        set({
            activeDocumentId: null,
            activeDocument: null,
        }),

    // Error handling
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),

    // Full reset
    reset: () => set(INITIAL_CORE_STATE),
}));
