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
            <ContextMenuContent className="w-48 bg-[#0A0A0A]/95 backdrop-blur-xl border-white/10 text-slate-200">
                <ContextMenuItem 
                    onClick={(e) => { e.stopPropagation(); onRename?.(); }}
                    className="focus:bg-white/10 focus:text-white cursor-pointer group gap-2"
                >
                    <Edit2 size={16} className="text-slate-500 group-focus:text-cyan-400" />
                    Rename
                </ContextMenuItem>
                
                <ContextMenuSeparator className="bg-white/10" />
                
                <ContextMenuItem 
                    onClick={(e) => { e.stopPropagation(); onCut?.(); }}
                    className="focus:bg-white/10 focus:text-white cursor-pointer group gap-2"
                >
                    <Scissors size={16} className="text-slate-500 group-focus:text-cyan-400" />
                    Cut
                </ContextMenuItem>

                <ContextMenuSeparator className="bg-white/10" />

                <ContextMenuItem 
                    onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                    className="focus:bg-red-500/10 focus:text-red-400 text-red-400 cursor-pointer group gap-2"
                >
                    <Trash2 size={16} className="text-red-400" />
                    Delete
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
};
