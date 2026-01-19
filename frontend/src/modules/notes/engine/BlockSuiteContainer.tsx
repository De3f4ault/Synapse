/**
 * BlockSuite Container - React Wrapper Component
 *
 * Full-screen immersive BlockSuite editor.
 * Provides the native AFFiNE experience with:
 * - Edgeless canvas (mindmaps, shapes, connectors)
 * - Page mode (rich text documents)
 * - Native toolbars and UI
 * - Full dark theme
 *
 * Compatible with BlockSuite v0.19.5
 */

// BlockSuite theme CSS - provides all --affine-* CSS variables
import "@toeverything/theme/style.css";

// Custom Synapse overrides (slash menu, dark theme, etc.)
import "./blocksuite-custom.css";

import { useEffect, useRef, useState } from "react";
import type { Doc } from "@blocksuite/store";

// BlockSuite imports
import { AffineEditorContainer } from "@blocksuite/presets";
import { effects as presetsEffects } from "@blocksuite/presets/effects";
import { effects as blocksEffects } from "@blocksuite/blocks/effects";

// Register all BlockSuite web components (MUST be done before instantiation)
presetsEffects();
blocksEffects();

// Set dark theme on the document root (BlockSuite reads this)
if (typeof document !== "undefined") {
  document.documentElement.dataset.theme = "dark";
}

// ============================================================================
// Types
// ============================================================================

export type EditorMode = "page" | "edgeless";

export interface BlockSuiteContainerProps {
  /** The BlockSuite Doc to render */
  doc: Doc;
  /** Initial editor mode */
  mode?: EditorMode;
  /** Additional class name for the container */
  className?: string;
  /** Callback when editor is ready */
  onEditorReady?: (editor: AffineEditorContainer) => void;
}

// ============================================================================
// Component
// ============================================================================

export function BlockSuiteContainer({
  doc,
  mode = "page",
  className = "",
  onEditorReady,
}: BlockSuiteContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<AffineEditorContainer | null>(null);
  const [isReady, setIsReady] = useState(false);

  // ----------------------------------------------------------------
  // Ensure dark theme is set
  // ----------------------------------------------------------------

  useEffect(() => {
    // Ensure dark theme attribute is set on mount
    document.documentElement.dataset.theme = "dark";
  }, []);

  // ----------------------------------------------------------------
  // Initialize Editor
  // ----------------------------------------------------------------

  useEffect(() => {
    if (!containerRef.current || !doc) {
      return;
    }

    // Clean up previous editor
    containerRef.current.innerHTML = "";

    // Create editor container
    const editor = new AffineEditorContainer();
    editor.autofocus = true;
    editor.doc = doc;
    editor.mode = mode;

    // Mount to DOM
    containerRef.current.appendChild(editor);
    editorRef.current = editor;

    // Wait for first update to complete
    const initEditor = async () => {
      try {
        // Wait for the editor to be fully initialized
        await editor.updateComplete;
        setIsReady(true);
        
        // Notify parent that editor is ready
        onEditorReady?.(editor);
      } catch (error) {
        console.error("[BlockSuiteContainer] Editor initialization error:", error);
      }
    };

    initEditor();

    // Cleanup
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      editorRef.current = null;
      setIsReady(false);
    };
  }, [doc]);

  // ----------------------------------------------------------------
  // Handle Mode Changes
  // ----------------------------------------------------------------

  useEffect(() => {
    if (editorRef.current && editorRef.current.mode !== mode && isReady) {
      editorRef.current.switchEditor(mode);
    }
  }, [mode, isReady]);

  // ----------------------------------------------------------------
  // Render - Full-screen native editor
  // ----------------------------------------------------------------

  return (
    <div
      ref={containerRef}
      className={className}
      data-theme="dark"
      style={{
        width: "100%",
        height: "100%",
      }}
    />
  );
}

export default BlockSuiteContainer;
