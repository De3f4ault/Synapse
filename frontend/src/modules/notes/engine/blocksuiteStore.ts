/**
 * BlockSuite Store - Local-First Engine
 *
 * Singleton Workspace with IndexedDB persistence.
 * All notes are stored locally in the browser.
 *
 * ============================================================================
 * ARCHITECTURE: LOCAL-FIRST (Phase 1)
 * ============================================================================
 * - Notes persist via IndexedDB automatically
 * - No backend sync (PostgreSQL frozen for now)
 * - Cross-tab sync via BroadcastChannel
 *
 * Compatible with BlockSuite v0.19.5 (DocCollection API)
 */

import { DocCollection, Schema } from "@blocksuite/store";
import { AffineSchemas } from "@blocksuite/blocks";
import type { Doc, DocMeta as BSDocMeta } from "@blocksuite/store";

// ============================================================================
// Constants
// ============================================================================

const WORKSPACE_ID = "synapse-notes";

// ============================================================================
// Types
// ============================================================================

export interface DocMeta {
  id: string;
  title: string;
  preview: string;
  createDate: number;
  updatedDate: number;
  tags: string[];
  trash?: boolean;
}

// ============================================================================
// Singleton Workspace
// ============================================================================

let workspaceInstance: DocCollection | null = null;

/**
 * Get or create the singleton Workspace (DocCollection).
 * Lives outside React lifecycle for stability.
 * 
 * NOTE: IndexedDB persistence is handled by BlockSuite internally
 * when we configure the workspace with an ID.
 */
export function getWorkspace(): DocCollection {
  if (!workspaceInstance) {
    const schema = new Schema().register(AffineSchemas);
    workspaceInstance = new DocCollection({ 
      schema,
      id: WORKSPACE_ID,
    });
    
    // Critical: Initialize metadata system before creating docs
    workspaceInstance.meta.initialize();
    
    console.log("[blocksuiteStore] Workspace initialized:", WORKSPACE_ID);
  }
  return workspaceInstance;
}

// ============================================================================
// Doc Management
// ============================================================================

/**
 * Create a new Doc with a unique ID.
 */
export function createDoc(id?: string): Doc {
  const workspace = getWorkspace();
  
  // Generate ID if not provided
  const docId = id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.debug(`[blocksuiteStore] Creating doc with id: "${docId}"`);

  // Check if doc already exists
  const existing = workspace.getDoc(docId);
  if (existing) {
    console.debug(`[blocksuiteStore] Found existing doc for id: "${docId}"`);
    return existing;
  }

  // Create new doc
  let doc: Doc | null = workspace.createDoc({ id: docId });
  
  if (!doc) {
    console.warn(`[blocksuiteStore] createDoc returned null, attempting to retrieve doc...`);
    doc = workspace.getDoc(docId);
  }
  
  if (!doc) {
    throw new Error(`BlockSuite createDoc returned null for id: ${docId}`);
  }
  
  doc.load();
  
  // Set initial metadata
  workspace.meta.setDocMeta(docId, {
    title: "",
    createDate: Date.now(),
  } as Partial<BSDocMeta>);
  
  console.debug(`[blocksuiteStore] Successfully created doc: "${docId}"`);
  return doc;
}

/**
 * Get an existing Doc by ID.
 */
export function getDoc(id: string): Doc | null {
  const workspace = getWorkspace();
  const doc = workspace.getDoc(id);
  if (doc) {
    doc.load();
  }
  return doc ?? null;
}

/**
 * Remove a Doc from the workspace (soft delete - sets trash flag).
 */
export function removeDoc(id: string): void {
  const workspace = getWorkspace();
  // Soft delete - set trash flag
  workspace.meta.setDocMeta(id, { trash: true } as Partial<BSDocMeta>);
}

/**
 * Permanently delete a Doc from the workspace.
 */
export function hardDeleteDoc(id: string): void {
  const workspace = getWorkspace();
  workspace.removeDoc(id);
}

// ============================================================================
// Doc Metadata
// ============================================================================

/**
 * List all doc metadata from the workspace.
 * Returns sorted by updatedDate descending.
 */
export function listDocMetas(): DocMeta[] {
  const workspace = getWorkspace();
  const metas: DocMeta[] = [];

  // Get all docs from workspace
  for (const [id] of workspace.docs) {
    const bsMeta = workspace.meta.getDocMeta(id);
    const doc = workspace.getDoc(id);
    
    // Skip trashed docs
    if ((bsMeta as any)?.trash) {
      continue;
    }

    // Extract title and preview from doc content
    const title = (doc ? extractDocTitle(doc) : null) || (bsMeta?.title as string) || "Untitled";
    const preview = doc ? extractDocPreview(doc) : "";

    metas.push({
      id,
      title,
      preview,
      createDate: (bsMeta?.createDate as number) || Date.now(),
      updatedDate: (bsMeta?.updatedDate as number) || (bsMeta?.createDate as number) || Date.now(),
      tags: (bsMeta?.tags as string[]) || [],
    });
  }

  // Sort by updatedDate descending
  return metas.sort((a, b) => b.updatedDate - a.updatedDate);
}

/**
 * Set metadata for a doc.
 */
export function setDocMeta(id: string, meta: Partial<DocMeta>): void {
  const workspace = getWorkspace();
  workspace.meta.setDocMeta(id, {
    ...meta,
    updatedDate: Date.now(),
  } as Partial<BSDocMeta>);
}

/**
 * Get metadata for a single doc.
 */
export function getDocMeta(id: string): DocMeta | null {
  const workspace = getWorkspace();
  const doc = workspace.getDoc(id);
  const bsMeta = workspace.meta.getDocMeta(id);

  if (!doc) {
    return null;
  }

  return {
    id,
    title: extractDocTitle(doc) || (bsMeta?.title as string) || "Untitled",
    preview: extractDocPreview(doc),
    createDate: (bsMeta?.createDate as number) || Date.now(),
    updatedDate: (bsMeta?.updatedDate as number) || Date.now(),
    tags: (bsMeta?.tags as string[]) || [],
    trash: (bsMeta as any)?.trash as boolean,
  };
}

// ============================================================================
// Content Extraction Helpers
// ============================================================================

/**
 * Extract title from doc blocks.
 * Looks for first heading or page title.
 */
export function extractDocTitle(doc: Doc): string | null {
  try {
    // First, check for page block title
    const pageBlocks = doc.getBlocksByFlavour("affine:page");
    for (const block of pageBlocks) {
      const title = (block.model as any).title?.toString();
      if (title && title.trim()) {
        return title.trim();
      }
    }

    // Then, look for first heading
    const paragraphs = doc.getBlocksByFlavour("affine:paragraph");
    for (const block of paragraphs) {
      const model = block.model as any;
      const type = model.type;
      if (type === "h1" || type === "h2" || type === "h3") {
        const text = model.text?.toString();
        if (text && text.trim()) {
          return text.trim();
        }
      }
    }

    // Fall back to first non-empty paragraph
    for (const block of paragraphs) {
      const text = (block.model as any).text?.toString();
      if (text && text.trim()) {
        return text.trim().substring(0, 50);
      }
    }

    return null;
  } catch (err) {
    console.warn("[extractDocTitle] Error:", err);
    return null;
  }
}

/**
 * Extract preview text from doc blocks.
 */
export function extractDocPreview(doc: Doc, maxLength = 200): string {
  try {
    const texts: string[] = [];

    // Get all paragraph blocks
    const paragraphs = doc.getBlocksByFlavour("affine:paragraph");
    for (const block of paragraphs) {
      const text = (block.model as any).text?.toString();
      if (text && text.trim()) {
        texts.push(text.trim());
      }
    }

    // Get list items too
    const lists = doc.getBlocksByFlavour("affine:list");
    for (const block of lists) {
      const text = (block.model as any).text?.toString();
      if (text && text.trim()) {
        texts.push(text.trim());
      }
    }

    const combined = texts.join(" ");
    return combined.length > maxLength 
      ? combined.substring(0, maxLength) + "..." 
      : combined;
  } catch (err) {
    console.warn("[extractDocPreview] Error:", err);
    return "";
  }
}

// ============================================================================
// Initialization Helper
// ============================================================================

/**
 * Check if a doc has any content (blocks).
 */
export function isDocEmpty(doc: Doc): boolean {
  const blocks = doc.getBlocksByFlavour("affine:page");
  return blocks.length === 0;
}

/**
 * Initialize an empty doc with a root page block.
 * Required for new notes before the editor can be used.
 */
export function initializeEmptyDoc(doc: Doc): void {
  if (!isDocEmpty(doc)) {
    return;
  }

  const anyDoc = doc as any;
  
  // Root page block
  const pageId = anyDoc.addBlock("affine:page", {});
  
  // Surface block (REQUIRED for edgeless canvas mode)
  anyDoc.addBlock("affine:surface", {}, pageId);

  // Note block with positioning (for edgeless canvas)
  const noteId = anyDoc.addBlock("affine:note", {
    xywh: "[0,0,800,95]",
  }, pageId);
  
  // Default paragraph inside note
  anyDoc.addBlock("affine:paragraph", {}, noteId);
  
  // Update metadata
  const workspace = getWorkspace();
  workspace.meta.setDocMeta(doc.id, {
    updatedDate: Date.now(),
  } as Partial<BSDocMeta>);
}

// ============================================================================
// Exports
// ============================================================================

export default {
  getWorkspace,
  createDoc,
  getDoc,
  removeDoc,
  hardDeleteDoc,
  listDocMetas,
  setDocMeta,
  getDocMeta,
  extractDocTitle,
  extractDocPreview,
  isDocEmpty,
  initializeEmptyDoc,
};
