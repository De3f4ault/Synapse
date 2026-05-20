import { motion } from "framer-motion";
import { FileText, Download, Share2, Trash2, Folder } from "lucide-react";
import { GlassCard } from "@/shared/ui";
import type { EnhancedDocument } from "../core/types";
import type { FolderTreeNode } from "../core/folders";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { FolderContextMenu } from "./FolderContextMenu";

interface DocumentsListProps {
    documents: EnhancedDocument[];
    folders?: FolderTreeNode[];
    selectedIds?: Set<string>;
    onToggleSelection?: (id: string, multi: boolean) => void;
    onFolderClick?: (folder: FolderTreeNode) => void;
    onFolderDoubleClick?: (folder: FolderTreeNode) => void;
    onFolderContextMenu?: (folder: FolderTreeNode, event: React.MouseEvent) => void;
    onDocumentClick?: (doc: EnhancedDocument) => void;
    onContextMenu?: (doc: EnhancedDocument, event: React.MouseEvent) => void;
    onRenameFolder?: (folder: FolderTreeNode) => void;
    onDeleteFolder?: (folder: FolderTreeNode) => void;
}

export const DocumentsList = ({ 
    documents, 
    folders = [],
    selectedIds = new Set(),
    onToggleSelection,
    onFolderClick,
    onFolderDoubleClick,
    onDocumentClick,
    onContextMenu,
    onRenameFolder,
    onDeleteFolder
}: DocumentsListProps) => {
    
    // Helper for click handling with modifiers
    const handleClick = (id: string, e: React.MouseEvent, defaultAction?: () => void) => {
        const isMulti = e.ctrlKey || e.metaKey || e.shiftKey;
        if (isMulti) {
            e.stopPropagation();
            onToggleSelection?.(id, true);
        } else {
            // If selecting, we might want to clear others or just run default action
            defaultAction?.();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
        >
            <GlassCard className="overflow-hidden border-border">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border bg-foreground/5">
                            <th className="text-left py-4 px-6 text-xs font-mono text-muted-foreground uppercase tracking-wider">Name</th>
                            <th className="text-left py-4 px-6 text-xs font-mono text-muted-foreground uppercase tracking-wider">Type</th>
                            <th className="text-left py-4 px-6 text-xs font-mono text-muted-foreground uppercase tracking-wider">Size</th>
                            <th className="text-left py-4 px-6 text-xs font-mono text-muted-foreground uppercase tracking-wider">Date Modified</th>
                            <th className="text-right py-4 px-6 text-xs font-mono text-muted-foreground uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Render Folders First */}
                        {folders.map((folder, i) => {
                            const isSelected = selectedIds.has(`folder:${folder.id}`);
                            return (
                                <FolderContextMenu
                                    key={`folder-${folder.id}`}
                                    onRename={() => onRenameFolder?.(folder)}
                                    onDelete={() => onDeleteFolder?.(folder)}
                                >
                                    <motion.tr
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        className={cn(
                                            "group transition-colors border-b border-border last:border-none cursor-pointer",
                                            isSelected ? "bg-primary/10 hover:bg-primary/20" : "hover:bg-muted/50"
                                        )}
                                        onClick={(e) => handleClick(`folder:${folder.id}`, e, () => onFolderClick?.(folder))}
                                        onDoubleClick={() => onFolderDoubleClick?.(folder)}
                                        // onContextMenu via wrapper
                                    >
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "p-2 rounded-lg transition-colors",
                                                    isSelected ? "bg-primary/20 text-primary/80" : "bg-primary/10 text-primary group-hover:bg-primary/20"
                                                )}>
                                                    <Folder size={18} fill="currentColor" className={isSelected ? "fill-cyan-300/20" : "fill-cyan-400/20"} />
                                                </div>
                                                <div>
                                                    <p className={cn(
                                                        "text-sm font-medium transition-colors",
                                                        isSelected ? "text-primary-foreground" : "text-foreground/70 group-hover:text-foreground"
                                                    )}>
                                                        {folder.name}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-xs font-mono text-muted-foreground uppercase bg-foreground/5 px-2 py-1 rounded border border-border">
                                                Folder
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-sm text-muted-foreground font-mono">
                                                -
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-sm text-muted-foreground">
                                                -
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            {/* Folder Actions (Placeholder) */}
                                        </td>
                                    </motion.tr>
                                </FolderContextMenu>
                            );
                        })}

                        {/* Render Documents */}
                        {documents.map((doc, i) => {
                            const isSelected = selectedIds.has(`doc:${doc.id}`);
                            return (
                                <motion.tr
                                    key={doc.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    className={cn(
                                        "group transition-colors border-b border-border last:border-none cursor-pointer",
                                        isSelected ? "bg-primary/10 hover:bg-primary/20" : "hover:bg-muted/50"
                                    )}
                                    onClick={(e) => handleClick(`doc:${doc.id}`, e, () => onDocumentClick?.(doc))}
                                    onContextMenu={(e) => onContextMenu?.(doc, e)}
                                >
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2 rounded-lg transition-colors",
                                                isSelected ? "bg-primary/20 text-primary/80" : "bg-foreground/5 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
                                            )}>
                                                <FileText size={18} />
                                            </div>
                                            <div>
                                                <p className={cn(
                                                    "text-sm font-medium transition-colors",
                                                    isSelected ? "text-primary-foreground" : "text-foreground/70 group-hover:text-foreground"
                                                )}>
                                                    {doc.filename}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-xs font-mono text-muted-foreground uppercase bg-foreground/5 px-2 py-1 rounded border border-border">
                                            {doc.type}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-sm text-muted-foreground font-mono">
                                            {doc.size}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-sm text-muted-foreground">
                                            {doc.updated_at ? format(new Date(doc.updated_at), "MMM d, yyyy") : "-"}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                                <Download size={16} />
                                            </button>
                                            <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                                <Share2 size={16} />
                                            </button>
                                            <button className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            );
                        })}
                    </tbody>
                </table>
            </GlassCard>
        </motion.div>
    );
};
