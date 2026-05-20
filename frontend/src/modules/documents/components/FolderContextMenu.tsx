import { Trash2, Edit2, Scissors } from "lucide-react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface FolderContextMenuProps {
    children: React.ReactNode;
    onRename?: () => void;
    onDelete?: () => void;
    onCut?: () => void;
}

/**
 * Context Menu for Folders (Wraps the folder card/row)
 */
export const FolderContextMenu = ({ children, onRename, onDelete, onCut }: FolderContextMenuProps) => {
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48 bg-popover backdrop-blur-xl border-border text-foreground/70">
                <ContextMenuItem 
                    onClick={(e) => { e.stopPropagation(); onRename?.(); }}
                    className="focus:bg-foreground/10 focus:text-foreground cursor-pointer group gap-2"
                >
                    <Edit2 size={16} className="text-muted-foreground group-focus:text-primary" />
                    Rename
                </ContextMenuItem>
                
                <ContextMenuSeparator className="bg-foreground/10" />
                
                <ContextMenuItem 
                    onClick={(e) => { e.stopPropagation(); onCut?.(); }}
                    className="focus:bg-foreground/10 focus:text-foreground cursor-pointer group gap-2"
                >
                    <Scissors size={16} className="text-muted-foreground group-focus:text-primary" />
                    Cut
                </ContextMenuItem>

                <ContextMenuSeparator className="bg-foreground/10" />

                <ContextMenuItem 
                    onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                    className="focus:bg-destructive/10 focus:text-destructive text-destructive cursor-pointer group gap-2"
                >
                    <Trash2 size={16} className="text-destructive" />
                    Delete
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
};
