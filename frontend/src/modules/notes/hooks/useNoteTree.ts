import { useQuery } from '@tanstack/react-query';
import { getNoteTreeApiV1NotesTreeGet } from '@/api/generated/services.gen';
import { QUERY_KEYS } from '@/lib/constants';
import type { NoteTreeNode } from '@/api/generated/types.gen';

/**
 * Hook for managing hierarchical note tree
 * Fetches and caches note tree structure
 */

interface UseNoteTreeOptions {
    rootId?: number | null;
}

export function useNoteTree(options: UseNoteTreeOptions = {}) {
    const { rootId } = options;

    // Fetch note tree
    const {
        data: tree = [],
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: [QUERY_KEYS.NOTES, 'tree', rootId],
        queryFn: () => getNoteTreeApiV1NotesTreeGet({ rootId: rootId ?? undefined }),
    });

    // Flatten tree for searching
    const flattenTree = (nodes: NoteTreeNode[]): NoteTreeNode[] => {
        return nodes.reduce<NoteTreeNode[]>((acc, node) => {
            acc.push(node);
            if (node.children && node.children.length > 0) {
                acc.push(...flattenTree(node.children));
            }
            return acc;
        }, []);
    };

    // Find node by ID
    const findNode = (
        nodes: NoteTreeNode[],
        id: number
    ): NoteTreeNode | undefined => {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children && node.children.length > 0) {
                const found = findNode(node.children, id);
                if (found) return found;
            }
        }
        return undefined;
    };

    // Get path to node (breadcrumbs)
    const getPath = (nodes: NoteTreeNode[], targetId: number): NoteTreeNode[] => {
        const path: NoteTreeNode[] = [];

        const findPath = (nodes: NoteTreeNode[], targetId: number): boolean => {
            for (const node of nodes) {
                path.push(node);
                if (node.id === targetId) return true;

                if (node.children && node.children.length > 0) {
                    if (findPath(node.children, targetId)) return true;
                }

                path.pop();
            }
            return false;
        };

        findPath(nodes, targetId);
        return path;
    };

    // Get direct children of a node
    const getChildren = (parentId: number | null): NoteTreeNode[] => {
        if (parentId === null) return tree;

        const parent = findNode(tree, parentId);
        return parent?.children || [];
    };

    return {
        tree,
        isLoading,
        error,
        refetch,
        // Helper methods
        flattenTree: () => flattenTree(tree),
        findNode: (id: number) => findNode(tree, id),
        getPath: (id: number) => getPath(tree, id),
        getChildren,
    };
}
