/**
 * useBlockSuiteDoc - React Hook for Doc Loading
 *
 * Simple get-or-create pattern for loading a BlockSuite doc.
 * No API sync - docs persist locally via IndexedDB.
 *
 * ============================================================================
 * ARCHITECTURE: LOCAL-FIRST (Phase 1)
 * ============================================================================
 */

import { useState, useEffect, useRef } from "react";
import type { Doc } from "@blocksuite/store";

import {
  getDoc,
  createDoc,
  initializeEmptyDoc,
} from "./blocksuiteStore";

// ============================================================================
// Types
// ============================================================================

export interface UseBlockSuiteDocOptions {
  /** Unique ID for the doc (usually note ID as string) */
  docId: string;
}

export interface UseBlockSuiteDocResult {
  /** The BlockSuite Doc instance */
  doc: Doc | null;
  /** Whether the doc is loading */
  isLoading: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useBlockSuiteDoc({
  docId,
}: UseBlockSuiteDocOptions): UseBlockSuiteDocResult {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (isInitializedRef.current) {
      return;
    }
    isInitializedRef.current = true;

    // Get or create doc from workspace
    let docInstance = getDoc(docId);
    
    if (!docInstance) {
      // Create new doc
      docInstance = createDoc(docId);
      initializeEmptyDoc(docInstance);
      console.log("[useBlockSuiteDoc] Created new doc:", docId);
    } else {
      console.log("[useBlockSuiteDoc] Loaded existing doc:", docId);
    }
    
    setDoc(docInstance);
    setIsLoading(false);

    // No cleanup needed - workspace persists docs
  }, [docId]);

  return { doc, isLoading };
}

export default useBlockSuiteDoc;
