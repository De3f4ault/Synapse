/**
 * Documents Sidebar Component
 * 
 * Sidebar with folder tree, upload action, and smart views.
 * Phase 1.5b: Integrated context menu with create/rename/delete.
 * Uses shared SidebarShell for consistent collapse/expand behavior.
 */

import { useState, useCallback } from "react";
import { FolderOpen, Plus, Clock, Star, Archive, Hash } from "lucide-react";
import { SavedViewSidebar } from "./dms/SavedViewSidebar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SidebarShell } from "@/shared/ui";
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

    // ── Folder selection ──
    const handleFolderSelect = useCallback((folder: FolderTreeNode | null) => {
        if (folder) {
            selectFolder(folder.id);
            setView({ type: 'folder', folderId: folder.id } as DocumentsView);
        } else {
            selectFolder(null);
            setView({ type: 'recent' } as DocumentsView);
        }
        onFolderSelect?.(folder);
    }, [selectFolder, setView, onFolderSelect]);

    // ── Context menu handlers ──
    const handleContextMenu = useCallback((folder: FolderTreeNode, position: { x: number; y: number }) => {
        setContextMenu({ folder, position });
    }, []);

    const handleCloseContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    const handleCreateFolder = useCallback(() => {
        setCreateDialogParent(null);
        setIsCreateDialogOpen(true);
    }, []);

    const handleCreateSubfolder = useCallback((parentFolder: FolderTreeNode) => {
        setCreateDialogParent({ id: parentFolder.id, name: parentFolder.name });
        setIsCreateDialogOpen(true);
        setContextMenu(null);
    }, []);

    const handleRename = useCallback((folder: FolderTreeNode) => {
        setRenamingFolderId(folder.id);
        setContextMenu(null);
    }, []);

    const handleRenameSubmit = useCallback((folderId: number, newName: string) => {
        updateFolder.mutate(
            { folderId, data: { name: newName } },
            {
                onSuccess: () => {
                    toast.success('Folder renamed');
                    setRenamingFolderId(null);
                },
                onError: () => toast.error('Failed to rename folder'),
            }
        );
    }, [updateFolder]);

    const handleCreateFolderSubmit = useCallback((name: string, parentId: number | null) => {
        createFolder.mutate(
            { name, parent: parentId },
            {
                onSuccess: () => {
                    toast.success('Folder created');
                    setIsCreateDialogOpen(false);
                },
                onError: () => toast.error('Failed to create folder'),
            }
        );
    }, [createFolder]);

    const handleDelete = useCallback((folder: FolderTreeNode) => {
        setContextMenu(null);
        if (window.confirm(`Delete "${folder.name}"? All contents will be moved to the root.`)) {
            deleteFolder.mutate(
                { folderId: folder.id },
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
            <SidebarShell
                storageKey="documentsSidebarCollapsed"
                title="Library"
                titleIcon={FolderOpen}
                primaryAction={{
                    label: "Upload",
                    icon: Plus,
                    onClick: () => onUpload?.(),
                }}
                statsLine={
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        {totalDocuments} Items
                    </span>
                }
                footerHint="Right-click folders to organize"
                className={className}
            >
                {(isCollapsed) => (
                    <>
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
                        <div className={cn("space-y-1 pt-4 border-t border-border mx-1", isCollapsed && "border-none pt-2")}>
                            {!isCollapsed && (
                                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-2 mb-2">
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
                                        onClick={() => {
                                            setView({ type: view.id } as DocumentsView);
                                        }}
                                        className={cn(
                                            "group flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer text-sm transition-colors",
                                            isActive
                                                ? "bg-muted border border-border text-foreground" 
                                                : "text-foreground/80 hover:bg-muted/50 hover:text-foreground border border-transparent"
                                        )}
                                    >
                                        <Icon className={cn(
                                            "shrink-0 w-4 h-4 transition-transform group-hover:scale-110",
                                            isActive ? "text-primary" : ""
                                        )} />
                                        {!isCollapsed && (
                                            <span className={cn(
                                                "text-sm transition-colors",
                                                isActive ? "text-foreground font-medium" : "text-muted-foreground group-hover:text-foreground/70"
                                            )}>
                                                {view.name}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Saved Views (DMS) */}
                        {!isCollapsed && <SavedViewSidebar views={[]} activeViewId={null} onViewClick={() => {}} className="mx-1 pt-3 border-t border-border" />}
                    </>
                )}
            </SidebarShell>

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
