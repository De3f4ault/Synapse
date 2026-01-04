/**
 * Document Selectors - Read-only access to document state
 *
 * INVARIANT:
 * Selectors are hooks that read state.
 * They MUST NOT trigger side effects.
 */

import { useDocumentStore } from "./documentStore";

/**
 * Get the active document ID
 */
export const useActiveDocumentId = () =>
    useDocumentStore((state) => state.activeDocumentId);

/**
 * Get the active document (full data)
 */
export const useActiveDocument = () =>
    useDocumentStore((state) => state.activeDocument);

/**
 * Check if a document is active
 */
export const useHasActiveDocument = () =>
    useDocumentStore((state) => state.activeDocumentId !== null);

/**
 * Check if a specific document is active
 */
export const useIsDocumentActive = (documentId: number) =>
    useDocumentStore((state) => state.activeDocumentId === documentId);

/**
 * Get document error state
 */
export const useDocumentError = () =>
    useDocumentStore((state) => state.error);

/**
 * Get document actions (for components that need to mutate)
 */
export const useDocumentActions = () =>
    useDocumentStore((state) => ({
        setActiveDocument: state.setActiveDocument,
        setActiveDocumentById: state.setActiveDocumentById,
        clearActiveDocument: state.clearActiveDocument,
        setError: state.setError,
        clearError: state.clearError,
        reset: state.reset,
    }));
