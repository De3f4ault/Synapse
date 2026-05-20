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
                    "hover:border-primary/30 hover:bg-muted/50",
                    // Selection state
                    isSelected && "border-primary bg-primary/10 ring-1 ring-primary/50",
                    // Drag over state
                    isOver && "border-primary bg-primary/20 scale-105 shadow-[0_0_30px_-5px_rgba(191,107,76,0.3)]"
                )}
                hover
            >
                {/* Icon */}
                <div className={cn(
                    "p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 mb-3",
                    "group-hover:from-primary/30 group-hover:to-primary/20 transition-colors",
                    isOver && "from-primary/40 to-primary/30"
                )}>
                    <Folder className={cn(
                        "w-8 h-8 text-primary fill-primary/20",
                        isOver && "text-primary/80 fill-primary/40 scale-110 transition-transform"
                    )} />
                </div>

                {/* Name */}
                <h3 className="text-sm font-medium text-foreground/70 text-center truncate w-full px-2">
                    {folder.name}
                </h3>

                {/* Meta info (optional, e.g. item count) */}
                <p className="text-xs text-muted-foreground mt-1">
                    Folder
                </p>

                {/* Context Menu Trigger (Visible on hover) */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full hover:bg-muted"
                        onClick={(e) => {
                            e.stopPropagation();
                            onContextMenu?.(e);
                        }}
                    >
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </Button>
                </div>
            </GlassCard>
        </div>
    );
};
