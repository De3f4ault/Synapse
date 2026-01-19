/**
 * useBlockSuiteOutline - Extract TOC and Frames from BlockSuite Doc
 *
 * This hook watches a BlockSuite document and extracts:
 * - Headings (H1, H2, H3, etc.) for Table of Contents
 * - Frames for edgeless mode presentations
 * - Properties (title, metadata)
 *
 * Compatible with BlockSuite v0.19.5
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import type { AffineEditorContainer } from "@blocksuite/presets";

// ============================================================================
// Types
// ============================================================================

export interface OutlineHeading {
  id: string;
  text: string;
  level: number; // 1-6 for h1-h6
  blockId: string;
}

export interface OutlineFrame {
  id: string;
  title: string;
  blockId: string;
}

export interface DocProperties {
  title: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BlockSuiteOutline {
  headings: OutlineHeading[];
  frames: OutlineFrame[];
  properties: DocProperties;
  isLoading: boolean;
  refresh: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useBlockSuiteOutline(
  editor: AffineEditorContainer | null
): BlockSuiteOutline {
  const [headings, setHeadings] = useState<OutlineHeading[]>([]);
  const [frames, setFrames] = useState<OutlineFrame[]>([]);
  const [properties, setProperties] = useState<DocProperties>({ title: "" });
  const [isLoading, setIsLoading] = useState(true);

  // ----------------------------------------------------------------
  // Extract outline from doc
  // ----------------------------------------------------------------

  const extractOutline = useCallback(() => {
    if (!editor?.doc) {
      setHeadings([]);
      setFrames([]);
      setProperties({ title: "" });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const doc = editor.doc;
      const extractedHeadings: OutlineHeading[] = [];
      const extractedFrames: OutlineFrame[] = [];

      // Get all blocks from the doc
      const blocks = doc.getBlocksByFlavour([
        "affine:paragraph",
        "affine:frame",
      ]);

      // Process each block
      for (const block of blocks) {
        const model = block as any; // Use any for flexibility with BlockSuite types
        
        // Extract headings from paragraphs
        if (model.flavour === "affine:paragraph") {
          const type = model.type || model.props?.type;
          
          // Check if it's a heading
          if (type && typeof type === "string" && type.startsWith("h")) {
            const level = parseInt(type.charAt(1), 10) || 1;
            const text = (model.text?.toString() || "").trim();
            
            if (text) {
              extractedHeadings.push({
                id: model.id,
                text,
                level,
                blockId: model.id,
              });
            }
          }
        }

        // Extract frames
        if (model.flavour === "affine:frame") {
          const title = model.title || model.props?.title || "Frame";
          
          extractedFrames.push({
            id: model.id,
            title: String(title),
            blockId: model.id,
          });
        }
      }

      // Get title from doc meta or first heading
      const meta = doc.meta;
      let title = meta?.title || "";
      if (!title && extractedHeadings.length > 0) {
        title = extractedHeadings[0].text;
      }

      setHeadings(extractedHeadings);
      setFrames(extractedFrames);
      setProperties({
        title,
        createdAt: meta?.createDate ? new Date(meta.createDate) : undefined,
        updatedAt: meta?.updatedDate ? new Date(meta.updatedDate) : undefined,
      });
    } catch (error) {
      console.error("[useBlockSuiteOutline] Error extracting outline:", error);
    } finally {
      setIsLoading(false);
    }
  }, [editor]);

  // ----------------------------------------------------------------
  // Watch for doc changes
  // ----------------------------------------------------------------

  useEffect(() => {
    if (!editor?.doc) return;

    // Initial extraction
    extractOutline();

    // Listen for doc updates
    const doc = editor.doc;
    const disposable = doc.slots.blockUpdated.on(() => {
      // Debounce updates slightly
      setTimeout(extractOutline, 100);
    });

    return () => {
      disposable.dispose();
    };
  }, [editor, extractOutline]);

  // ----------------------------------------------------------------
  // Return outline data
  // ----------------------------------------------------------------

  return useMemo(
    () => ({
      headings,
      frames,
      properties,
      isLoading,
      refresh: extractOutline,
    }),
    [headings, frames, properties, isLoading, extractOutline]
  );
}

export default useBlockSuiteOutline;
