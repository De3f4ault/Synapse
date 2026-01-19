/**
 * NotesPage - Main notes hub
 * 
 * Lists all notes from local workspace.
 * Local-first: No API sync, docs persist via IndexedDB.
 *
 * ============================================================================
 * ARCHITECTURE: LOCAL-FIRST (Phase 1)
 * ============================================================================
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspaceDocs } from "@/modules/notes/engine/useWorkspaceDocs";
import { NotesHub } from "./components/NotesHub";

export function NotesPage() {
  const navigate = useNavigate();

  // Get docs from workspace (local-first)
  const { docs, isLoading, createDoc, deleteDoc } = useWorkspaceDocs();

  // Local UI state
  const [activeFilter, setActiveFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  // Create new note
  const handleCreateNote = () => {
    const newId = createDoc();
    navigate(`/notes/${newId}`);
  };

  // Open note
  const handleSelectNote = (id: string | number) => {
    navigate(`/notes/${id}`);
  };

  // Delete note
  const handleDeleteNote = (id: string) => {
    deleteDoc(id);
  };

  // Filter logic (Search + Tag Filter)
  const filteredNotes = useMemo(() => {
    if (!docs) return [];
    
    return docs.filter((note) => {
      // 1. Tag Filter
      if (activeFilter !== "All") {
        const hasTag = note.tags?.some((t) => t === activeFilter);
        if (!hasTag) return false;
      }
      
      // 2. Search Query
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        const titleMatch = note.title?.toLowerCase().includes(lowerQuery);
        const previewMatch = note.preview?.toLowerCase().includes(lowerQuery);
        return titleMatch || previewMatch;
      }

      return true;
    });
  }, [docs, activeFilter, searchQuery]);

  return (
    <NotesHub 
      notes={filteredNotes}
      isLoading={isLoading}
      viewMode={viewMode}
      onViewChange={setViewMode}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      onCreate={handleCreateNote}
      onNoteClick={handleSelectNote}
      onNoteDelete={handleDeleteNote}
    />
  );
}
