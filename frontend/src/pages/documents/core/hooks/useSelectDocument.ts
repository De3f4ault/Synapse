/**
 * useSelectDocument Hook
 *
 * Convenience hook for selecting a document as active.
 * Combines store actions with any side effects needed.
 */

import { useCallback } from "react";
import { useDocumentActions } from "../state";
import type { EnhancedDocument } from "../engine/types";

/**
 * Hook for selecting/deselecting documents
 */
export function useSelectDocument() {
    const { setActiveDocument, clearActiveDocument } = useDocumentActions();

    const selectDocument = useCallback(
        (document: EnhancedDocument) => {
            setActiveDocument(document);
        },
        [setActiveDocument]
    );

    const deselectDocument = useCallback(() => {
        clearActiveDocument();
    }, [clearActiveDocument]);

    const toggleDocument = useCallback(
        (document: EnhancedDocument, currentActiveId: number | null) => {
            if (currentActiveId === document.id) {
                clearActiveDocument();
            } else {
                setActiveDocument(document);
            }
        },
        [setActiveDocument, clearActiveDocument]
    );

    return {
        selectDocument,
        deselectDocument,
        toggleDocument,
    };
}
