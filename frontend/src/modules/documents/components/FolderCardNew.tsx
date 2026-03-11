/**
 * FolderCard — Square UI full card style.
 *
 * Color-coded icon badge with tinted background.
 * Shows folder name + document count.
 * Preserves: useDroppable for drag-and-drop targets.
 */

import { Folder, MoreVertical } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { FolderTreeNode } from "../core/types/folder.types";

/** Default palette for folders that have no color set */
const DEFAULT_FOLDER_COLORS = [
  "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4",
  "#10B981", "#6366F1", "#EF4444", "#14B8A6",
];

function getFolderColor(folder: FolderTreeNode): string {
  // Use folder's settings.color if available
  if (folder.settings?.color) return folder.settings.color;
  // Auto-assign from palette based on folder id
  return DEFAULT_FOLDER_COLORS[folder.id % DEFAULT_FOLDER_COLORS.length];
}

interface FolderCardProps {
  folder: FolderTreeNode;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export function FolderCardNew({ folder, isSelected, onClick, onDoubleClick, onContextMenu }: FolderCardProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `folder-${folder.id}`,
    data: { type: "folder", folder },
  });

  const color = getFolderColor(folder);

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      className={cn(
        "group flex items-center gap-3 p-3 rounded-xl border bg-card cursor-pointer transition-all duration-200",
        isSelected
          ? "ring-2 ring-primary/50 border-primary/30"
          : "border-border/50 hover:border-border hover:shadow-md hover:shadow-black/10",
        isOver && "ring-2 ring-primary/50 border-primary/30 scale-[1.02]"
      )}
    >
      {/* Color-coded icon */}
      <div
        className="size-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}15` }}
      >
        <Folder
          className="size-4.5"
          style={{ color }}
          fill={`${color}30`}
        />
      </div>

      {/* Name & count */}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground truncate">{folder.name}</p>
        {folder.document_count > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {folder.document_count} file{folder.document_count !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* More menu */}
      <button
        onClick={(e) => { e.stopPropagation(); onContextMenu(e); }}
        className="size-7 flex items-center justify-center rounded-md
                   text-muted-foreground opacity-0 group-hover:opacity-100
                   hover:text-foreground hover:bg-muted/50 transition-all"
      >
        <MoreVertical className="size-4" />
      </button>
    </div>
  );
}
