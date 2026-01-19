/**
 * useWorkspaceDocs - React Hook for Doc Listing
 *
 * Provides reactive access to all docs in the workspace.
 * Replaces API-based hooks for local-first architecture.
 *
 * ============================================================================
 * ARCHITECTURE: LOCAL-FIRST (Phase 1)
 * ============================================================================
 */

import { useState, useEffect, useCallback } from "react";
import {
  getWorkspace,
  createDoc as storeCreateDoc,
  removeDoc as storeRemoveDoc,
  listDocMetas,
  initializeEmptyDoc,
  type DocMeta,
} from "./blocksuiteStore";

// Re-export DocMeta type for consumers
export type { DocMeta } from "./blocksuiteStore";

// ============================================================================
// Types
// ============================================================================

export interface UseWorkspaceDocsResult {
  /** All docs in the workspace */
  docs: DocMeta[];
  /** Whether initial load is in progress */
  isLoading: boolean;
  /** Create a new doc, returns its ID */
  createDoc: () => string;
  /** Delete a doc by ID (soft delete) */
  deleteDoc: (id: string) => void;
  /** Refresh the docs list */
  refresh: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useWorkspaceDocs(): UseWorkspaceDocsResult {
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load docs from workspace
  const loadDocs = useCallback(() => {
    try {
      const metas = listDocMetas();
      setDocs(metas);
    } catch (err) {
      console.error("[useWorkspaceDocs] Failed to load docs:", err);
      setDocs([]);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    // Initial load
    loadDocs();
    setIsLoading(false);

    // Subscribe to workspace changes
    const workspace = getWorkspace();
    
    // BlockSuite emits events when docs change
    const disposables: Array<{ dispose: () => void }> = [];

    // Subscribe to doc list updates
    const docListSub = (workspace as any).slots?.docListUpdated?.on(() => {
      loadDocs();
    });
    if (docListSub) {
      disposables.push(docListSub);
    }

    // Subscribe to doc meta updates
    const metaSub = (workspace as any).meta?.docMetaUpdated?.on(() => {
      loadDocs();
    });
    if (metaSub) {
      disposables.push(metaSub);
    }

    // Cleanup subscriptions
    return () => {
      disposables.forEach(d => d.dispose?.());
    };
  }, [loadDocs]);

  // Create a new doc
  const createDoc = useCallback(() => {
    const doc = storeCreateDoc();
    initializeEmptyDoc(doc);
    loadDocs(); // Refresh list
    return doc.id;
  }, [loadDocs]);

  // Delete a doc (soft delete)
  const deleteDoc = useCallback((id: string) => {
    storeRemoveDoc(id);
    loadDocs(); // Refresh list
  }, [loadDocs]);

  return {
    docs,
    isLoading,
    createDoc,
    deleteDoc,
    refresh: loadDocs,
  };
}

export default useWorkspaceDocs;
