import { motion } from "framer-motion";
import type { EnhancedDocument } from "../core/types";
import type { FolderTreeNode } from "../core/folders";
import { DocumentCard } from "./DocumentCard";
import { FolderCard } from "./FolderCard";
import { FolderContextMenu } from "./FolderContextMenu";
import { useFolderStore } from "../core/state/folderStore";

interface DocumentGridProps {
    documents: EnhancedDocument[];
    folders?: FolderTreeNode[];
    onDocumentClick?: (doc: EnhancedDocument) => void;
    onFolderClick?: (folder: FolderTreeNode) => void;
    onFolderDoubleClick?: (folder: FolderTreeNode) => void;
    onFolderContextMenu?: (folder: FolderTreeNode, event: React.MouseEvent) => void;
    onContextMenu?: (doc: EnhancedDocument, event: React.MouseEvent) => void;
    thumbnails?: Record<string, string | null>;
    selectedIds?: Set<string>;
    onToggleSelection?: (id: string, multi: boolean) => void;
    onRenameFolder?: (folder: FolderTreeNode) => void;
    onDeleteFolder?: (folder: FolderTreeNode) => void;
}

export const DocumentGrid = ({ 
    documents, 
    folders = [],
    onDocumentClick, 
    onContextMenu, 
    onFolderClick,
    onFolderDoubleClick,
    thumbnails,
    selectedIds = new Set(),
    onToggleSelection,
    onRenameFolder,
    onDeleteFolder
}: DocumentGridProps) => {
    const { cutItems } = useFolderStore();
    
    // Helper for click handling with modifiers
    const handleClick = (id: string, e: React.MouseEvent | undefined, defaultAction?: () => void) => {
        if (!e) return defaultAction?.();
        
        const isMulti = e.ctrlKey || e.metaKey || e.shiftKey;
        if (isMulti) {
            e.stopPropagation();
            onToggleSelection?.(id, true);
        } else {
            // If selecting, we might want to clear others or just run default action
            // For now, let's say simple click runs default action (open/navigate)
            defaultAction?.();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-5"
        >
            {/* Render Folders First */}
            {folders.map((folder) => (
                <FolderContextMenu 
                    key={`folder-${folder.id}`}
                    onRename={() => onRenameFolder?.(folder)}
                    onDelete={() => onDeleteFolder?.(folder)}
                    onCut={() => cutItems([`folder:${folder.id}`])}
                >
                    <FolderCard
                        folder={folder}
                        isSelected={selectedIds.has(`folder:${folder.id}`)}
                        onClick={(e: any) => handleClick(`folder:${folder.id}`, e, () => onFolderClick?.(folder))}
                        onDoubleClick={() => onFolderDoubleClick?.(folder)}
                        // onContextMenu removed as it's handled by wrapper
                    />
                </FolderContextMenu>
            ))}

            {/* Render Documents */}
            {documents.map((doc) => (
                <DocumentCard
                    key={`doc-${doc.id}`}
                    document={doc}
                    isSelected={selectedIds.has(`doc:${doc.id}`)}
                    onClick={(e: any) => handleClick(`doc:${doc.id}`, e, () => onDocumentClick?.(doc))}
                    onContextMenu={onContextMenu ? (e: React.MouseEvent) => onContextMenu(doc, e) : undefined}
                    thumbnailUrl={thumbnails?.[doc.id.toString()]}
                />
            ))}
        </motion.div>
    );
};
