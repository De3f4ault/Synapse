/**
 * Notes Module Exports
 * Central export point for all notes-related functionality
 */

// Main Pages
export { NotesPage } from "./NotesPage";
export { NoteDetailPage } from "./NoteDetailPage";

// List Components
export { NoteCard } from "./components/list/NoteCard";
export { NoteTree, NeuralItem } from "./components/list/NoteTree";
export { NoteSearch } from "./components/list/NoteSearch";

// Editor Components
export { NoteEditor } from "./components/editor/NoteEditor";
export { EditorToolbar } from "./components/editor/EditorToolbar";
export { MarkdownPreview } from "./components/editor/MarkdownPreview";

// Detail Components
export { NoteHeader } from "./components/detail/NoteHeader";
export { VersionHistory } from "./components/detail/VersionHistory";
export { NoteTags } from "./components/detail/NoteTags";

// Shared Components
export { NoteStats } from "./components/shared/NoteStats";

// Hooks
export { useNotes, useNote } from "./hooks/useNotes";
export { useNoteEditor } from "./hooks/useNoteEditor";
export { useNoteTree } from "./hooks/useNoteTree";

// Utils
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
} from "./utils/markdown";

export {
  sortNotes,
  groupNotesByDate,
  //  groupNotesByTag,
  //  findRelatedNotes,
  //  getAllTags,
  //  getTagStats,
  //  flattenTree,
  //  getNoteDepth,
  //  getNotePath,
} from "./utils/noteOrganizer";

// Types
export type * from "./types/notes.types";
