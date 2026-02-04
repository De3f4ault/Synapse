/**
 * Documents Sidebar Component
 * 
 * Sidebar with folder tree, upload action, and smart views.
 * Phase 1.5b: Integrated context menu with create/rename/delete.
 */

import { useState, useCallback } from "react";
import { FolderOpen, Plus, Clock, Star, Archive, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { NeumorphicButton } from "@/components/neumorphic";
import { GlassCard } from "@/shared/ui";
import { FolderTree } from "./FolderTree";
import { FolderContextMenu } from "./tree/FolderContextMenu";
import { CreateFolderDialog } from "./dialogs/CreateFolderDialog";
import { useFolderStore, type DocumentsView } from "../core/state/folderStore";
import { useCreateFolder, useUpdateFolder, useDeleteFolder } from "../core/hooks/useFolders";
import type { FolderTreeNode } from "../core/folders";

interface DocumentsSidebarProps {
    className?: string;
    activeSector?: string;
    onSectorChange?: (sector: string) => void;
    totalDocuments: number;
    onUpload?: () => void;
    isCollapsed?: boolean;
    onFolderSelect?: (folder: FolderTreeNode | null) => void;
}

// Context menu state type
interface ContextMenuState {
    folder: FolderTreeNode;
    position: { x: number; y: number };
}

export const DocumentsSidebar = ({
    className,
    totalDocuments,
    onUpload,
    isCollapsed = false,
    onFolderSelect,
}: DocumentsSidebarProps) => {
    const { selectedFolderId, selectFolder, currentView, setView } = useFolderStore();
    
    // State for context menu and dialogs
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [createDialogParent, setCreateDialogParent] = useState<{ id: number | null; name: string } | null>(null);
    const [renamingFolderId, setRenamingFolderId] = useState<number | null>(null);
    
    // Mutations
    const createFolder = useCreateFolder();
    const updateFolder = useUpdateFolder();
    const deleteFolder = useDeleteFolder();

    const handleFolderSelect = (folder: FolderTreeNode | null) => {
        selectFolder(folder?.id ?? null);
        onFolderSelect?.(folder);
    };

    // Open create folder dialog (root level)
    const handleCreateFolder = useCallback(() => {
        setCreateDialogParent(null);
        setIsCreateDialogOpen(true);
    }, []);

    // Handle create folder submission
    const handleCreateFolderSubmit = useCallback(async (name: string, parentId: number | null) => {
        try {
            await createFolder.mutateAsync({ name, parent_id: parentId });
            toast.success(parentId ? 'Subfolder created' : 'Folder created');
        } catch (error) {
            console.error('Failed to create folder:', error);
            toast.error('Failed to create folder');
        }
    }, [createFolder]);

    // Context menu handlers
    const handleContextMenu = useCallback((folder: FolderTreeNode, event: React.MouseEvent) => {
        event.preventDefault();
        setContextMenu({
            folder,
            position: { x: event.clientX, y: event.clientY },
        });
    }, []);

    const handleCloseContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    const handleCreateSubfolder = useCallback((parentId: number) => {
        const parent = contextMenu?.folder;
        setCreateDialogParent({ id: parentId, name: parent?.name || 'Folder' });
        setIsCreateDialogOpen(true);
    }, [contextMenu]);

    const handleRename = useCallback((folder: FolderTreeNode) => {
        setRenamingFolderId(folder.id);
    }, []);

    const handleRenameSubmit = useCallback(async (id: number, newName: string) => {
        if (!newName.trim()) {
            setRenamingFolderId(null);
            return;
        }

        try {
            await updateFolder.mutateAsync({ id, name: newName });
            toast.success('Folder renamed');
        } catch (error) {
            console.error('Failed to rename folder:', error);
            toast.error('Failed to rename folder');
        } finally {
            setRenamingFolderId(null);
        }
    }, [updateFolder]);

    const handleDelete = useCallback((folder: FolderTreeNode) => {
        const confirmed = confirm(
            `Delete "${folder.name}"?\n\nDocuments in this folder will be moved to the parent folder.`
        );
        if (confirmed) {
            deleteFolder.mutate(
                { id: folder.id, strategy: 'promote' },
                {
                    onSuccess: () => {
                        toast.success('Folder deleted');
                        if (selectedFolderId === folder.id) {
                            selectFolder(null);
                        }
                    },
                    onError: () => toast.error('Failed to delete folder'),
                }
            );
        }
    }, [deleteFolder, selectedFolderId, selectFolder]);

    // Smart views configuration
    const smartViews = [
        { id: 'recent', name: 'Recent', icon: Clock },
        { id: 'favorites', name: 'Favorites', icon: Star },
        { id: 'archived', name: 'Archived', icon: Archive },
    ];

    return (
        <>
            <GlassCard
                className={cn(
                    "flex h-full w-full flex-col bg-zinc-950/40 backdrop-blur-3xl border border-white/10 transition-all duration-300 ease-in-out",
                    className
                )}
            >
                {/* Header / Upload Action */}
                <div className="p-4 flex flex-col gap-4 shrink-0">
                    <div className={cn("flex items-center gap-2 transition-opacity duration-200", isCollapsed ? "justify-center" : "")}>
                        <FolderOpen className={cn("text-cyan-400 transition-all", isCollapsed ? "w-8 h-8" : "w-5 h-5")} />
                        {!isCollapsed && (
                            <h2 className="text-xl font-bold text-white whitespace-nowrap">Library</h2>
                        )}
                    </div>

                    {!isCollapsed && (
                        <div className="flex gap-4 text-xs text-slate-400 px-1">
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                                {totalDocuments} Items
                            </span>
                        </div>
                    )}

                    {/* Primary Upload Button */}
                    <NeumorphicButton
                        onClick={onUpload}
                        className={cn(
                            "w-full flex items-center justify-center gap-2 font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-none shadow-lg shadow-cyan-900/20",
                            isCollapsed ? "p-3 rounded-full aspect-square w-12" : "py-3 rounded-xl"
                        )}
                        title="Upload"
                    >
                        <Plus className="w-5 h-5" />
                        {!isCollapsed && <span>Upload</span>}
                    </NeumorphicButton>
                </div>

                {/* Navigation / Folder Tree */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
                    {/* Folder Tree with DnD */}
                    {!isCollapsed && (
                            <FolderTree 
                                onFolderSelect={handleFolderSelect}
                                onCreateFolder={handleCreateFolder}
                                onContextMenu={handleContextMenu}
                                renamingId={renamingFolderId}
                                onRenameSubmit={handleRenameSubmit}
                                disableInternalDnd={true}
                            />
                    )}

                    {/* Smart Views */}
                    <div className={cn("space-y-1 pt-4 border-t border-white/5 mx-3", isCollapsed && "border-none pt-2")}>
                        {!isCollapsed && (
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 font-bold px-2 mb-2">
                                <Hash className="w-3 h-3" />
                                <span>Views</span>
                            </div>
                        )}

                        {smartViews.map((view) => {
                            const Icon = view.icon;
                            const isActive = currentView.type === view.id;
                            
                            return (
                                <div
                                    key={view.id}
                                    title={isCollapsed ? view.name : undefined}
                                    onClick={() => {
                                        setView({ type: view.id } as DocumentsView);
                                    }}
                                    className={cn(
                                        "group flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition-all duration-150",
                                        isCollapsed && "justify-center px-2",
                                        isActive 
                                            ? "bg-cyan-500/15 text-cyan-100" 
                                            : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                                    )}
                                >
                                    <Icon className={cn(
                                        "shrink-0 transition-transform group-hover:scale-110",
                                        isCollapsed ? "w-5 h-5" : "w-4 h-4",
                                        isActive ? "text-cyan-400" : ""
                                    )} />
                                    {!isCollapsed && (
                                        <span className={cn(
                                            "text-sm font-medium transition-colors",
                                            isActive ? "text-cyan-100" : "text-slate-400 group-hover:text-slate-200"
                                        )}>
                                            {view.name}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Hint */}
                {!isCollapsed && (
                    <div className="p-4 mx-4 mb-4 rounded-xl bg-white/5 border border-white/5 shrink-0">
                        <p className="text-xs text-slate-400 text-center leading-relaxed">
                            Right-click folders to organize
                        </p>
                    </div>
                )}
            </GlassCard>

            {/* Context Menu */}
            {contextMenu && (
                <FolderContextMenu
                    folder={contextMenu.folder}
                    position={contextMenu.position}
                    onClose={handleCloseContextMenu}
                    onCreateSubfolder={handleCreateSubfolder}
                    onRename={handleRename}
                    onDelete={handleDelete}
                />
            )}

            {/* Create Folder Dialog */}
            <CreateFolderDialog
                isOpen={isCreateDialogOpen}
                onClose={() => setIsCreateDialogOpen(false)}
                onCreate={handleCreateFolderSubmit}
                parentId={createDialogParent?.id ?? null}
                parentName={createDialogParent?.name}
            />
        </>
    );
};
