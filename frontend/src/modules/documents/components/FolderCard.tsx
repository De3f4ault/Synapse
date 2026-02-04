/**
 * Folder Card Component
 * 
 * Represents a folder in the unified grid view.
 * Supports drag-and-drop as a drop target.
 */

import { Folder, MoreVertical } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/shared/ui";
import { Button } from "@/components/ui/button";
import type { FolderTreeNode } from "../core/folders";

interface FolderCardProps {
    folder: FolderTreeNode;
    onDoubleClick?: () => void;
    onClick?: (e?: React.MouseEvent) => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    isSelected?: boolean;
}

export const FolderCard = ({ 
    folder, 
    onDoubleClick, 
    onClick,
    onContextMenu,
    isSelected 
}: FolderCardProps) => {
    // Drop target for documents
    const { setNodeRef, isOver } = useDroppable({
        id: `folder-${folder.id}`,
        data: { 
            type: 'folder', 
            folder 
        },
    });

    return (
        <div
            ref={setNodeRef}
            onDoubleClick={onDoubleClick}
            onClick={onClick}
            onContextMenu={onContextMenu}
            className="cursor-pointer group relative"
        >
            <GlassCard
                className={cn(
                    "flex flex-col items-center justify-center p-4 h-[160px] transition-all duration-200",
                    // Interaction states
                    "hover:border-cyan-500/30 hover:bg-white/5",
                    // Selection state
                    isSelected && "border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/50",
                    // Drag over state
                    isOver && "border-cyan-400 bg-cyan-500/20 scale-105 shadow-[0_0_30px_-5px_rgba(34,211,238,0.3)]"
                )}
                hover
            >
                {/* Icon */}
                <div className={cn(
                    "p-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 mb-3",
                    "group-hover:from-cyan-500/30 group-hover:to-blue-500/30 transition-colors",
                    isOver && "from-cyan-500/40 to-blue-500/40"
                )}>
                    <Folder className={cn(
                        "w-8 h-8 text-cyan-400 fill-cyan-400/20",
                        isOver && "text-cyan-200 fill-cyan-200/40 scale-110 transition-transform"
                    )} />
                </div>

                {/* Name */}
                <h3 className="text-sm font-medium text-slate-200 text-center truncate w-full px-2">
                    {folder.name}
                </h3>

                {/* Meta info (optional, e.g. item count) */}
                <p className="text-xs text-slate-500 mt-1">
                    Folder
                </p>

                {/* Context Menu Trigger (Visible on hover) */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full hover:bg-white/10"
                        onClick={(e) => {
                            e.stopPropagation();
                            onContextMenu?.(e);
                        }}
                    >
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                    </Button>
                </div>
            </GlassCard>
        </div>
    );
};
