/**
 * FolderNode Component
 * 
 * Single folder row in the tree. Handles expand/collapse, selection, and drag.
 * Also acts as a drop target for documents.
 */

import { useMemo, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { 
  ChevronRight, 
  ChevronDown,
  Folder,
  FolderOpen,
  Inbox,
  FileText,
  BookOpen,
  Image,
  FolderKanban,
  Download,
  Archive,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFolderStore } from '../../core/state/folderStore';
import type { FolderTreeNode } from '../../core/types/folder.types';

// Icon mapping for system folders
const ICON_MAP: Record<string, typeof Folder> = {
  'inbox': Inbox,
  'file-text': FileText,
  'book-open': BookOpen,
  'image': Image,
  'folder-kanban': FolderKanban,
  'download': Download,
  'archive': Archive,
  'folder': Folder,
};

interface FolderNodeProps {
  folder: FolderTreeNode;
  depth: number;
  onSelect?: (folder: FolderTreeNode) => void;
  onContextMenu?: (folder: FolderTreeNode, event: React.MouseEvent) => void;
  renamingId?: number | null;
  onRenameSubmit?: (id: number, newName: string) => void;
}

export function FolderNode({ 
  folder, 
  depth, 
  onSelect,
  onContextMenu,
  renamingId,
  onRenameSubmit,
}: FolderNodeProps) {
  const { 
    expandedIds, 
    selectedFolderId, 
    draggingId,
    toggleExpand, 
    selectFolder 
  } = useFolderStore();

  const isExpanded = expandedIds.has(folder.id);
  const isSelected = selectedFolderId === folder.id;
  const isDragging = draggingId === folder.id;
  const hasChildren = folder.children.length > 0;

  // Sortable hook for folder-to-folder drag and drop
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: folder.id.toString(),
    data: {
      type: 'folder',
      folder,
    },
    disabled: folder.is_system, // System folders cannot be dragged
  });

  // Droppable hook for accepting document drops
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `folder-drop-${folder.id}`,
    data: {
      type: 'folder',
      folderId: folder.id,
    },
  });

  // Combine refs for both sortable and droppable
  const setNodeRef = (node: HTMLElement | null) => {
    setSortableRef(node);
    setDroppableRef(node);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  // Get the appropriate icon
  const IconComponent = useMemo(() => {
    const iconName = folder.settings?.icon || 'folder';
    const BaseIcon = ICON_MAP[iconName] || Folder;
    
    // Use open folder icon when expanded and has children
    if (hasChildren && isExpanded && BaseIcon === Folder) {
      return FolderOpen;
    }
    return BaseIcon;
  }, [folder.settings?.icon, hasChildren, isExpanded]);

  // Rename state
  const isRenaming = renamingId === folder.id;
  const [tempName, setTempName] = useState(folder.name);

  // Reset temp name when renaming starts
  useMemo(() => {
    if (isRenaming) setTempName(folder.name);
  }, [isRenaming, folder.name]);

  const handleRenameSubmit = () => {
    if (tempName.trim() && tempName !== folder.name) {
      onRenameSubmit?.(folder.id, tempName);
    } else {
      // Cancel/Reset
      onRenameSubmit?.(folder.id, folder.name);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectFolder(folder.id);
    onSelect?.(folder);
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleExpand(folder.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    selectFolder(folder.id);
    onContextMenu?.(folder, e);
  };

  return (
    <div>
      {/* Folder Row */}
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={cn(
          "group flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer",
          "transition-all duration-150 select-none",
          // Indentation based on depth
          depth > 0 && "ml-4",
          // Drop target highlight
          isOver && "bg-primary/20 border-primary/50 ring-2 ring-primary/30",
          // States
          isSelected && !isOver
            ? "bg-primary/15 border border-primary/30 text-primary-foreground" 
            : !isOver && "hover:bg-muted/50 border border-transparent text-muted-foreground hover:text-foreground/70",
          isDragging && "opacity-50",
          folder.is_system && "cursor-default",
        )}
      >
        {/* Expand/Collapse Button */}
        <button
          onClick={handleExpandClick}
          className={cn(
            "w-4 h-4 flex items-center justify-center shrink-0",
            "text-muted-foreground hover:text-foreground/80 transition-colors",
            !hasChildren && "invisible"
          )}
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Folder Icon */}
        <div 
          className={cn(
            "w-5 h-5 flex items-center justify-center shrink-0",
            isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground/80"
          )}
          style={{ color: folder.settings?.color }}
        >
          <IconComponent className="w-4 h-4" />
        </div>

        {/* Name */}
        {/* Name or Rename Input */}
        {isRenaming ? (
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit();
              if (e.key === 'Escape') onRenameSubmit?.(folder.id, folder.name);
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            className="flex-1 min-w-0 bg-slate-900 text-primary-foreground text-sm px-1 py-0.5 rounded border border-primary/50 outline-none focus:ring-1 focus:ring-primary/50"
          />
        ) : (
          <span className={cn(
            "flex-1 text-sm font-medium truncate",
            isSelected ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground/70"
          )}>
            {folder.name}
          </span>
        )}

        {/* Document Count Badge */}
        {folder.document_count > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {folder.document_count}
          </span>
        )}

        {/* More Actions (only visible on hover) */}
        {!folder.is_system && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onContextMenu?.(folder, e);
            }}
            className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground/80 transition-all"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Children (recursive) */}
      {isExpanded && hasChildren && (
        <div className="ml-2">
          {folder.children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              depth={depth + 1}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              renamingId={renamingId}
              onRenameSubmit={onRenameSubmit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
