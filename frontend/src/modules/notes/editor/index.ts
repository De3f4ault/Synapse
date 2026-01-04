/**
 * Notes Module - Editor Public API
 *
 * RULE: All editor imports go through this file.
 */

// ============================================================================
// Engine (Pure Functions)
// ============================================================================

export {
    wrapText,
    makeBold,
    makeItalic,
    makeCode,
    makeInlineCode,
    makeLink,
    makeHeading,
    makeListItem,
    makeList,
    stripMarkdown,
    countWords,
    countCharacters,
    estimateReadingTime,
    extractHeadings,
    generateTOC,
} from "./engine/markdown";
export type { Heading } from "./engine/markdown";

export {
    getTextAreaSelection,
    insertTextAtCursor,
    wrapSelection,
    markdownFormatters,
    getCurrentLine,
    replaceCurrentLine,
} from "./engine/selection";
export type { TextAreaSelection, LineInfo } from "./engine/selection";

// ============================================================================
// State
// ============================================================================

export {
    useEditorStore,
    useEditorIsDirty,
    useEditorIsAutosaving,
    useEditorMode,
    useEditorHasError,
    useEditorError,
} from "./state/editorStore";

// ============================================================================
// Hooks
// ============================================================================

export { useNoteEditor } from "./hooks/useNoteEditor";
export { useEditorShortcuts } from "./hooks/useEditorShortcuts";

// ============================================================================
// Components
// ============================================================================

export { NoteEditor } from "./components/NoteEditor";
export { EditorToolbar } from "./components/EditorToolbar";
export { MarkdownPreview } from "./components/MarkdownPreview";
