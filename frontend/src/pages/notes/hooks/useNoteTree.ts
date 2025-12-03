import { useState, useMemo, useCallback } from 'react';
import type { NoteResponse } from '@/api/generated/types.gen';
import type { NoteTreeItem } from '../types/notes.types';

/**
 * Custom hook for managing note tree state and operations
 */
export function useNoteTree(notes: NoteResponse[] | undefined) {
    const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    // Build hierarchical tree structure
    const noteTree = useMemo(() => {
        if (!notes) return [];

        const tree: NoteTreeItem[] = [];
        const map = new Map<number, NoteTreeItem>();

        // Initialize map with children arrays
        notes.forEach((note) => {
            map.set(note.id, { ...note, children: [] });
        });

        // Build hierarchy
        notes.forEach((note) => {
            const node = map.get(note.id)!;
            if (note.parent_id && map.has(note.parent_id)) {
                map.get(note.parent_id)!.children!.push(node);
            } else {
                tree.push(node);
            }
        });

        return tree;
    }, [notes]);

    // Filter notes by search query
    const filteredTree = useMemo(() => {
        if (!searchQuery.trim()) return noteTree;

        const filterRecursive = (items: NoteTreeItem[]): NoteTreeItem[] => {
            return items.reduce((acc, item) => {
                const matchesSearch = item.title
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase());
                const filteredChildren = item.children
                ? filterRecursive(item.children)
                : [];

                if (matchesSearch || filteredChildren.length > 0) {
                    acc.push({
                        ...item,
                        children: filteredChildren,
                    });
                }

                return acc;
            }, [] as NoteTreeItem[]);
        };

        return filterRecursive(noteTree);
    }, [noteTree, searchQuery]);

    const toggleFolder = useCallback((id: number) => {
        setExpandedFolders((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const expandAll = useCallback(() => {
        if (!notes) return;
        const allIds = notes.map((n) => n.id);
        setExpandedFolders(new Set(allIds));
    }, [notes]);

    const collapseAll = useCallback(() => {
        setExpandedFolders(new Set());
    }, []);

    return {
        noteTree,
        filteredTree,
        expandedFolders,
        searchQuery,
        setSearchQuery,
        toggleFolder,
        expandAll,
        collapseAll,
    };
}
