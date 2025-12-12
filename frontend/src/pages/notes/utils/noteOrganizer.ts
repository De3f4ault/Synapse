import type { NoteResponse } from '@/api/generated';
import type { NoteTreeItem } from '../types/notes.types';

/**
 * Sort notes by various criteria
 */
export type SortBy = 'title' | 'created' | 'updated' | 'size';
export type SortOrder = 'asc' | 'desc';

/**
 * Sort notes by specified criteria
 */
export function sortNotes(
    notes: NoteResponse[],
    by: SortBy = 'updated',
    order: SortOrder = 'desc'
): NoteResponse[] {
    const sorted = [...notes].sort((a, b) => {
        let comparison = 0;

        switch (by) {
            case 'title':
                comparison = a.title.localeCompare(b.title);
                break;
            case 'created':
                comparison =
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                break;
            case 'updated':
                comparison =
                new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
                break;
            case 'size':
                comparison = (a.content?.length || 0) - (b.content?.length || 0);
                break;
        }

        return order === 'asc' ? comparison : -comparison;
    });

    return sorted;
}

/**
 * Group notes by date (today, yesterday, this week, etc.)
 */
export function groupNotesByDate(notes: NoteResponse[]): Map<string, NoteResponse[]> {
    const groups = new Map<string, NoteResponse[]>();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    notes.forEach((note) => {
        const noteDate = new Date(note.updated_at);
        let group: string;

        if (noteDate >= today) {
            group = 'Today';
        } else if (noteDate >= yesterday) {
            group = 'Yesterday';
        } else if (noteDate >= weekAgo) {
            group = 'This Week';
        } else {
            group = 'Older';
        }

        if (!groups.has(group)) {
            groups.set(group, []);
        }
        groups.get(group)!.push(note);
    });

    return groups;
}

/**
 * Group notes by tags
 */
export function groupNotesByTag(notes: NoteResponse[]): Map<string, NoteResponse[]> {
    const groups = new Map<string, NoteResponse[]>();

    notes.forEach((note) => {
        if (note.tags && note.tags.length > 0) {
            note.tags.forEach((tag) => {
                if (!groups.has(tag)) {
                    groups.set(tag, []);
                }
                groups.get(tag)!.push(note);
            });
        } else {
            if (!groups.has('Untagged')) {
                groups.set('Untagged', []);
            }
            groups.get('Untagged')!.push(note);
        }
    });

    return groups;
}

/**
 * Find notes related to a given note (by tags)
 */
export function findRelatedNotes(
    note: NoteResponse,
    allNotes: NoteResponse[],
    limit: number = 5
): NoteResponse[] {
    if (!note.tags || note.tags.length === 0) {
        return [];
    }

    const noteTags = new Set(note.tags);

    const scored = allNotes
    .filter((n) => n.id !== note.id)
    .map((n) => {
        const commonTags = (n.tags || []).filter((tag) => noteTags.has(tag)).length;
        return { note: n, score: commonTags };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

    return scored.map((item) => item.note);
}

/**
 * Get all unique tags from notes
 */
export function getAllTags(notes: NoteResponse[]): string[] {
    const tagSet = new Set<string>();
    notes.forEach((note) => {
        if (note.tags) {
            note.tags.forEach((tag) => tagSet.add(tag));
        }
    });
    return Array.from(tagSet).sort();
}

/**
 * Get tag usage statistics
 */
export function getTagStats(notes: NoteResponse[]): Map<string, number> {
    const tagCounts = new Map<string, number>();

    notes.forEach((note) => {
        if (note.tags) {
            note.tags.forEach((tag) => {
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            });
        }
    });

    return new Map([...tagCounts.entries()].sort((a, b) => b[1] - a[1]));
}

/**
 * Flatten tree structure to array
 */
export function flattenTree(tree: NoteTreeItem[]): NoteResponse[] {
    const result: NoteResponse[] = [];

    const traverse = (items: NoteTreeItem[]) => {
        items.forEach((item) => {
            result.push(item);
            if (item.children && item.children.length > 0) {
                traverse(item.children);
            }
        });
    };

    traverse(tree);
    return result;
}

/**
 * Get note depth in tree
 */
export function getNoteDepth(noteId: number, notes: NoteResponse[]): number {
    let depth = 0;
    let currentId: number | undefined = noteId;

    while (currentId) {
        const note = notes.find((n) => n.id === currentId);
        if (!note || !note.parent_id) break;
        depth++;
        currentId = note.parent_id;
    }

    return depth;
}

/**
 * Get breadcrumb path for a note
 */
export function getNotePath(noteId: number, notes: NoteResponse[]): NoteResponse[] {
    const path: NoteResponse[] = [];
    let currentId: number | undefined = noteId;

    while (currentId) {
        const note = notes.find((n) => n.id === currentId);
        if (!note) break;
        path.unshift(note);
        currentId = note.parent_id;
    }

    return path;
}
