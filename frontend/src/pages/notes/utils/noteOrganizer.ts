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

// Tag functions removed as tags are not supported in NoteResponse
/*
export function groupNotesByTag(notes: NoteResponse[]): Map<string, NoteResponse[]> {
    // ...
}

export function findRelatedNotes(...): NoteResponse[] {
    // ...
}

export function getAllTags(...): string[] {
    // ...
}

export function getTagStats(...): Map<string, number> {
    // ...
}
*/

// Tree functions removed as NoteResponse does not support parent_id/children
/*
export function flattenTree(tree: NoteTreeItem[]): NoteResponse[] {
    // ...
}

export function getNoteDepth(noteId: number, notes: NoteResponse[]): number {
    // ...
}

export function getNotePath(noteId: number, notes: NoteResponse[]): NoteResponse[] {
    // ...
}
*/
