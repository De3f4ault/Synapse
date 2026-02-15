/**
 * FolderCard — Gallery Mode.
 * Minimal: gradient icon + name. No border box.
 * Compact horizontal layout — folders are a strip, not full cards.
 */

import { Folder } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { FolderTreeNode } from "../core/types/folder.types";

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

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      className={cn(
        "group flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-200",
        isSelected
          ? "bg-cyan-500/[0.08] text-cyan-300"
          : "text-zinc-300 hover:bg-white/[0.04] hover:text-zinc-100",
        isOver && "bg-cyan-500/10 text-cyan-300 scale-[1.02] ring-1 ring-cyan-500/30"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
        isSelected || isOver ? "bg-cyan-500/15" : "bg-white/[0.04]"
      )}>
        <Folder className={cn(
          "w-4 h-4",
          isSelected || isOver ? "text-cyan-400 fill-cyan-400/20" : "text-zinc-500 fill-zinc-500/10"
        )} />
      </div>
      <span className="text-[13px] font-medium truncate">{folder.name}</span>
      {folder.document_count > 0 && (
        <span className="text-[11px] text-zinc-500 tabular-nums ml-auto">{folder.document_count}</span>
      )}
    </div>
  );
}
