/**
 * FolderTree Component
 * 
 * Main tree container with DnD context.
 */

import { useCallback, useEffect, useRef } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Folder, Plus, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useFolderTree, useMoveFolder, useSeedDefaultFolders } from '../core/hooks/useFolders';
import { useFolderStore } from '../core/state/folderStore';
import { FolderNode } from './tree/FolderNode';
import type { FolderTreeNode } from '../core/types/folder.types';

interface FolderTreeProps {
  className?: string;
  onFolderSelect?: (folder: FolderTreeNode | null) => void;
  onCreateFolder?: () => void;
  onContextMenu?: (folder: FolderTreeNode, event: React.MouseEvent) => void;
  renamingId?: number | null;
  onRenameSubmit?: (id: number, newName: string) => void;
  /** If true, skip internal DndContext (parent provides one) */
  disableInternalDnd?: boolean;
}

export function FolderTree({ 
  className, 
  onFolderSelect,
  onCreateFolder,
  onContextMenu,
  renamingId,
  onRenameSubmit,
  disableInternalDnd = false,
}: FolderTreeProps) {
  const { data: folders, isLoading, error, refetch } = useFolderTree();
  const moveFolder = useMoveFolder();
  const seedFolders = useSeedDefaultFolders();
  const { setDragging, draggingId, selectFolder } = useFolderStore();

  // Configure DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance before activation
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get flat list of folder IDs for SortableContext
  const folderIds = useCallback(() => {
    if (!folders) return [];
    
    const collectIds = (nodes: FolderTreeNode[]): string[] => {
      return nodes.flatMap(node => [
        node.id.toString(),
        ...collectIds(node.children),
      ]);
    };
    
    return collectIds(folders);
  }, [folders]);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setDragging(Number(active.id));
  }, [setDragging]);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setDragging(null);

    if (!over || active.id === over.id) return;

    const activeId = Number(active.id);
    const overId = Number(over.id);

    // Find the folder being dropped on
    const findFolder = (nodes: FolderTreeNode[], id: number): FolderTreeNode | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        const found = findFolder(node.children, id);
        if (found) return found;
      }
      return null;
    };

    if (!folders) return;

    const activeFolder = findFolder(folders, activeId);
    const overFolder = findFolder(folders, overId);

    if (!activeFolder || !overFolder) return;

    // Determine move position
    // For now, we move "after" the target folder at the same level
    moveFolder.mutate({
      id: activeId,
      new_parent_id: overFolder.parent_id,
      position: 'after',
      sibling_id: overId,
    });
  }, [folders, moveFolder, setDragging]);

  // Handle folder selection
  const handleFolderSelect = useCallback((folder: FolderTreeNode) => {
    selectFolder(folder.id);
    onFolderSelect?.(folder);
  }, [selectFolder, onFolderSelect]);

  // Track if we've already attempted seeding (prevents infinite loop)
  const hasAttemptedSeed = useRef(false);

  // Auto-seed folders if none exist (only attempt once)
  useEffect(() => {
    if (!isLoading && folders && folders.length === 0 && !hasAttemptedSeed.current && !seedFolders.isPending) {
      hasAttemptedSeed.current = true;
      seedFolders.mutate();
    }
  }, [isLoading, folders, seedFolders.isPending]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("py-4 px-3", className)}>
        <p className="text-sm text-destructive">Failed to load folders</p>
        <button 
          onClick={() => refetch()}
          className="text-sm text-primary hover:text-primary/80 mt-2"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (!folders || folders.length === 0) {
    return (
      <div className={cn("py-4 px-3 text-center", className)}>
        <Folder className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No folders yet</p>
        <button
          onClick={() => seedFolders.mutate()}
          disabled={seedFolders.isPending}
          className="text-sm text-primary hover:text-primary/80 mt-2"
        >
          {seedFolders.isPending ? 'Creating...' : 'Create defaults'}
        </button>
      </div>
    );
  }

  // Find the folder being dragged for overlay
  const findDraggingFolder = (): FolderTreeNode | null => {
    if (!draggingId || !folders) return null;
    
    const find = (nodes: FolderTreeNode[]): FolderTreeNode | null => {
      for (const node of nodes) {
        if (node.id === draggingId) return node;
        const found = find(node.children);
        if (found) return found;
      }
      return null;
    };
    
    return find(folders);
  };

  const draggingFolder = findDraggingFolder();

  // Folder tree content (used both with and without DndContext)
  const treeContent = (
    <SortableContext
      items={folderIds()}
      strategy={verticalListSortingStrategy}
    >
      <div className="px-1">
        {folders.map((folder) => (
          <FolderNode
            key={folder.id}
            folder={folder}
            depth={0}
            onSelect={handleFolderSelect}
            onContextMenu={onContextMenu}
            renamingId={renamingId}
            onRenameSubmit={onRenameSubmit}
          />
        ))}
      </div>
    </SortableContext>
  );

  return (
    <div className={cn("py-2", className)}>
      {/* Header with Add button */}
      <div className="flex items-center justify-between px-3 mb-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
          Folders
        </span>
        <button
          onClick={onCreateFolder}
          className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
          title="New folder"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* DnD Context - skip if parent provides one */}
      {disableInternalDnd ? (
        treeContent
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {treeContent}

          {/* Drag Overlay */}
          <DragOverlay>
            {draggingFolder && (
              <div className="flex items-center gap-2 py-1.5 px-3 bg-slate-800/90 border border-primary/30 rounded-lg shadow-lg">
                <Folder className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary-foreground">{draggingFolder.name}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
