import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useNotesList } from "@/modules/notes";
import { useCreateNote } from "@/api/hooks/useNotes";
import { NotesHub } from "./components/NotesHub";

/**
 * NotesPage - Main notes hub
 * Orchestrates list, search, and navigation using modules/notes
 */
export function NotesPage() {
  const navigate = useNavigate();

  // List state from module
  const {
    notes,
    isLoading,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
  } = useNotesList();

  // Local filter state (mimicking Flashcards/Documents patterns)
  const [activeFilter, setActiveFilter] = useState("All");

  // Mutations
  const createNoteMutation = useCreateNote();
  // const deleteNoteMutation = useDeleteNote(); // Kept for future use if inline delete is added

  // Handlers
  const handleCreateNote = () => {
    createNoteMutation.mutate(
      {
        title: "", // Empty title for new note
        content: " ",
        tags: [],
      },
      {
        onSuccess: (data: any) => {
          navigate(`/notes/${data.id}`);
        },
      },
    );
  };

  const handleSelectNote = (id: number) => {
    navigate(`/notes/${id}`);
  };

  // Filter logic (combines Search + Tag Filter)
  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    
    return notes.filter((note: any) => {
        // 1. Tag Filter
        if (activeFilter !== "All") {
             const hasTag = note.tags?.some((t: any) => (t.name || t) === activeFilter);
             if (!hasTag) return false;
        }
        
        // 2. Search Query (already filtered by API usually, but if client-side:)
        // The useNotesList hook likely handles searchQuery via API, but if it's client-side:
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            const titleMatch = note.title?.toLowerCase().includes(lowerQuery);
            const contentMatch = note.content?.toLowerCase().includes(lowerQuery);
            return titleMatch || contentMatch;
        }

        return true;
    });
  }, [notes, activeFilter, searchQuery]);

  return (
    <NotesHub 
        notes={filteredNotes}
        isLoading={isLoading}
        viewMode={(viewMode === 'grid' || viewMode === 'list') ? viewMode : 'grid'}
        onViewChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onCreate={handleCreateNote}
        onNoteClick={handleSelectNote}
    />
  );
}
