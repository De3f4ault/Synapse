/**
 * Notes Module - useNotesList Hook
 * Consolidated hook for list view state and data.
 *
 * CONSOLIDATES: pages/notes/hooks/useNoteTree.ts + useNotes.ts list logic
 */

import { useMemo, useCallback } from "react";
import { useNotes as useNotesQuery, useNoteTree as useTreeQuery } from "@/api/hooks/useNotes";
import { useListStore } from "../state/listStore";
import type { NoteTreeItem, ViewMode } from "../../core";
import { emitNoteEvent, noteSearched } from "../../core";

// ============================================================================
// Hook
// ============================================================================

/**
 * Consolidated hook for notes list view.
 *
 * Provides:
 * - Notes data (list or tree based on viewMode)
 * - List/tree navigation state
 * - Search and filter state
 * - View mode switching
 */
export function useNotesList() {
    // API data
    const { data: notes, isLoading: isLoadingList } = useNotesQuery();
    const { data: tree, isLoading: isLoadingTree } = useTreeQuery();

    // Store state
    const {
        viewMode,
        searchQuery,
        filterTags,
        selectedId,
        expandedIds: expandedIdsArray,
        setViewMode,
        setSearchQuery,
        setFilterTags,
        toggleExpanded,
        expandAll,
        collapseAll,
        setSelectedId,
        reset,
    } = useListStore();

    // Memoize Set conversion to avoid infinite re-renders
    const expandedIds = useMemo(
        () => new Set(expandedIdsArray),
        [expandedIdsArray]
    );

    // Filtered notes based on search
    const filteredNotes = useMemo(() => {
        if (!notes) return [];

        let result = [...notes];

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (note) =>
                    note.title.toLowerCase().includes(query) ||
                    note.content.toLowerCase().includes(query)
            );
            // Emit search event for analytics
            emitNoteEvent(noteSearched(searchQuery, result.length));
        }

        // Apply tag filter
        if (filterTags.length > 0) {
            result = result.filter((note) => {
                const noteTags = (note as any).tags?.map((t: any) => t.name || t) || [];
                return filterTags.some((tag) => noteTags.includes(tag));
            });
        }

        return result;
    }, [notes, searchQuery, filterTags]);

    // Build tree structure from flat notes
    const treeNotes = useMemo((): NoteTreeItem[] => {
        if (tree) {
            // API returns pre-built tree
            return tree as NoteTreeItem[];
        }

        // Fallback: build from flat list
        if (!notes) return [];

        const noteMap = new Map<number, NoteTreeItem>();
        const roots: NoteTreeItem[] = [];

        // First pass: create map
        notes.forEach((note) => {
            noteMap.set(note.id, { ...note, children: [] } as NoteTreeItem);
        });

        // Second pass: build tree
        notes.forEach((note) => {
            const item = noteMap.get(note.id)!;
            if (note.parent_id && noteMap.has(note.parent_id)) {
                noteMap.get(note.parent_id)!.children!.push(item);
            } else {
                roots.push(item);
            }
        });

        return roots;
    }, [notes, tree]);

    // Expand all root nodes
    const expandRoots = useCallback(() => {
        const rootIds = treeNotes.map((n) => n.id);
        expandAll(rootIds);
    }, [treeNotes, expandAll]);

    return {
        // Data
        notes: filteredNotes,
        treeNotes,
        isLoading: isLoadingList || isLoadingTree,

        // View state
        viewMode,
        setViewMode: setViewMode as (mode: ViewMode) => void,

        // Search state
        searchQuery,
        setSearchQuery,

        // Filter state
        filterTags,
        setFilterTags,

        // Tree navigation
        selectedId,
        setSelectedId,
        expandedIds,
        toggleExpanded,
        expandAll,
        expandRoots,
        collapseAll,

        // Reset
        reset,
    };
}
