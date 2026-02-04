import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { 
  DndContext, 
  DragEndEvent, 
  DragStartEvent,
  DragOverlay,
  PointerSensor, 
  useSensor, 
  useSensors,
  pointerWithin,
} from "@dnd-kit/core";
import { FileText } from "lucide-react";
import { DocumentsHub, DocumentContextMenu } from "@/modules/documents";
import { useFolderStore } from "@/modules/documents/core/state/folderStore";
import { useExplorer } from "@/modules/documents/core/hooks/useExplorer";
import { useListStore } from "./list";
import { useUploadQueue, UploadQueueBar } from "./upload";
import { useDocumentViewer, DocumentViewer } from "./viewer";
import type { EnhancedDocument } from "@/modules/documents/core/types";
import type { FolderTreeNode } from "@/modules/documents/core/types/folder.types";
import { DocumentsService } from "@/api/generated";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import {
  useToggleFavorite,
  useArchiveDocument,
  useRenameDocument,
  useDownloadDocument,
} from "@/modules/documents/core/hooks/useDocumentActions";

// Context menu state type
interface ContextMenuState {
  doc: EnhancedDocument;
  position: { x: number; y: number };
}

/**
 * Main Documents Page Component
 * Wraps the modern DocumentsHub with necessary business logic and upload handling.
 */
export function DocumentsPage() {
  const queryClient = useQueryClient();
  

  
  // UI state from list store
  const viewMode = useListStore((state) => state.viewMode) || "grid";
  const setViewMode = useListStore((state) => state.setViewMode);

  // Local UI state
  const [activeSector, setActiveSector] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);


  const logAction = (msg: string) => console.log("DOC_LOG:", msg);

  // Document action hooks
  const toggleFavorite = useToggleFavorite();
  const archiveDocument = useArchiveDocument();
  const renameDocument = useRenameDocument();
  const downloadDocument = useDownloadDocument();



  // Phase 3: Use unified Explorer hook
  const { 
    documents, 
    folders,
    isLoading, 
    deleteDocument,
    updateFolder,
    deleteFolder,
    createFolder,
    currentView
  } = useExplorer();

  // Navigation handlers
  const { setView } = useFolderStore();
  
  const handleFolderDoubleClick = useCallback((folder: any) => {
    setView({ type: 'folder', folderId: folder.id });
  }, [setView]);

  const {
    isProcessing,
    getRootProps,
    getInputProps,
    replaceFile,
    keepBothFile,
  } = useUploadQueue({ logAction });

  const { selectedDocument, isViewerOpen, openViewer, closeViewer } =
    useDocumentViewer();

  // Filter documents (search only - folder/view filtering done in useExplorer)
  const filtered = documents.filter(
    (d: EnhancedDocument) =>
      (activeSector === "All" || d.sector === activeSector) &&
      d.filename.toLowerCase().includes(search.toLowerCase()),
  );

  // DnD sensors for document drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Track dragging document for DragOverlay
  const [draggingDoc, setDraggingDoc] = useState<EnhancedDocument | null>(null);

  // Handle drag start - track what's being dragged
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const activeData = event.active.data.current;
    if (activeData?.type === 'document') {
      setDraggingDoc(activeData.document);
    }
  }, []);

  const { 
    selectedItemIds, 
    clearSelection, 
    clipboard, 
    clearClipboard, 
    selectAll 
  } = useFolderStore();

  // Handle document drop onto folder
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setDraggingDoc(null);
    
    const { active, over } = event;
    if (!over) return;
    
    const activeData = active.data.current;
    const overData = over.data.current;
    
    if (activeData?.type === 'document' && overData?.type === 'folder') {
      const targetFolderId = overData.folderId ?? overData.folder?.id;
      if (!targetFolderId) return;

      if (!activeData?.document?.id) return;
      const draggedDocId = Number(activeData.document.id);
      const draggedIdKey = `doc:${draggedDocId}`;
      
      // Determine which documents to move
      let docIdsToMove = [draggedDocId];
      
      // If the dragged document is part of the current selection, move ALL selected documents
      if (selectedItemIds.has(draggedIdKey)) {
        const selectedDocs = Array.from(selectedItemIds)
            .filter(id => id.startsWith('doc:'))
            .map(id => {
                const parts = id.split(':');
                return parts.length > 1 ? parseInt(parts[1] as string) : 0;
            })
            .filter(id => id !== 0);
            
        // If the dragged item was selected, we use the selection set.
        // (If dragging an unselected item, we ignore selection and just move that one)
        if (selectedDocs.length > 0) {
            docIdsToMove = selectedDocs;
        }
      }

      console.log(`Moving ${docIdsToMove.length} documents to folder ${targetFolderId}`);
      
      try {
        await Promise.all(docIdsToMove.map(id => 
            DocumentsService.moveDocumentApiV1DocumentsDocumentIdMovePatch(
                id,
                { folder_id: targetFolderId }
            )
        ));
        
        queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
        toast.success(`Moved ${docIdsToMove.length} document${docIdsToMove.length > 1 ? 's' : ''}`);
        clearSelection();
      } catch (error) {
        console.error('Failed to move documents:', error);
        toast.error('Failed to move documents');
      }
    }
  }, [queryClient, selectedItemIds, clearSelection]);

  // Context menu handlers
  const handleContextMenu = useCallback((doc: EnhancedDocument, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      doc,
      position: { x: e.clientX, y: e.clientY },
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleToggleFavorite = useCallback(() => {
    if (contextMenu) {
      const isFav = (contextMenu.doc as unknown as { is_favorite?: boolean }).is_favorite ?? false;
      toggleFavorite.mutate(contextMenu.doc.id, isFav);
    }
  }, [contextMenu, toggleFavorite]);

  const handleArchive = useCallback(() => {
    if (contextMenu) {
      archiveDocument.mutate(contextMenu.doc.id);
    }
  }, [contextMenu, archiveDocument]);

  const handleRename = useCallback(() => {
    if (contextMenu) {
      const newName = prompt('Enter new name:', contextMenu.doc.filename);
      if (newName && newName.trim() && newName !== contextMenu.doc.filename) {
        renameDocument.mutate(contextMenu.doc.id, newName.trim());
      }
    }
  }, [contextMenu, renameDocument]);

  const handleDownload = useCallback(() => {
    if (contextMenu) {
      downloadDocument.mutate(contextMenu.doc.id);
    }
  }, [contextMenu, downloadDocument]);

  const handleMove = useCallback(() => {
    // TODO: Implement MoveToFolderDialog
    toast.info('Move to folder coming soon');
  }, []);

  const handleFolderRename = useCallback((folder: FolderTreeNode) => {
    const newName = prompt("Rename Folder", folder.name);
    if (newName && newName !== folder.name) {
      updateFolder({ id: folder.id, name: newName });
      toast.success("Folder renamed");
    }
  }, [updateFolder]);

  const handleFolderDelete = useCallback((folder: FolderTreeNode) => {
    if (confirm(`Are you sure you want to delete "${folder.name}"?`)) {
      deleteFolder({ id: folder.id });
      toast.success("Folder deleted");
    }
  }, [deleteFolder]);



  const handlePaste = useCallback(async () => {
    if (!clipboard || !clipboard.items.length) return;
    
    // Determine target folder (current view)
    const targetFolderId = currentView.type === 'folder' ? currentView.folderId : null;
    
    // Only support 'cut' (move) for now as 'copy' needs backend support
    if (clipboard.op === 'cut') {
      try {
        const itemIds = clipboard.items
          .filter(id => id.startsWith('doc:'))
          .map(id => Number(id.split(':')[1]));
          
        if (itemIds.length > 0) {
           await Promise.all(itemIds.map(id => 
              DocumentsService.moveDocumentApiV1DocumentsDocumentIdMovePatch(
                  id,
                  { folder_id: targetFolderId }
              )
           ));
           toast.success(`Moved ${itemIds.length} items`);
           queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
           clearClipboard();
        }
      } catch (err) {
        console.error("Paste failed", err);
        toast.error("Failed to move items");
      }
    } else {
        toast.info("Copy not fully supported yet");
    }
  }, [clipboard, currentView, queryClient, clearClipboard]);

  const handleSelectAll = useCallback(() => {
     const allIds = documents.map(d => `doc:${d.id}`);
     // If we had folders in the list, we'd add them too. 
     // current folders are in `folders`
     const allFolderIds = folders.map(f => `folder:${f.id}`);
     selectAll([...allIds, ...allFolderIds]);
  }, [documents, folders, selectAll]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    // Also folders
    queryClient.invalidateQueries({ queryKey: ['folders'] });
    toast.success("Refreshed");
  }, [queryClient]);

  const handleCreateFolder = useCallback(() => {
    const defaultParentId = currentView.type === 'folder' ? currentView.folderId : null;
    const name = prompt("Enter folder name:");
    
    if (name) {
      createFolder({ 
        name, 
        parent_id: defaultParentId 
      });
      toast.success("Folder created");
    }
  }, [createFolder, currentView]);

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        {...(draggingDoc ? {} : getRootProps({ onClick: (e) => e.stopPropagation() }))}
        className="h-full relative"
      >
        {/* Hidden file input for drag & drop global handler */}
        <input {...getInputProps()} />

        {/* Main UI Hub */}
        <DocumentsHub
          documents={filtered as any}
          folders={folders}
          isLoading={isLoading}
          viewMode={viewMode}
          onViewChange={setViewMode}
          searchQuery={search}
          onSearchChange={setSearch}
          activeFilter={activeSector}
          onFilterChange={setActiveSector}
          onUpload={() => {
            // Trigger hidden input click
            document.querySelector('input[type="file"]')?.dispatchEvent(new MouseEvent('click'));
          }}
          onDocumentClick={openViewer as any}
          onFolderDoubleClick={handleFolderDoubleClick}
          onContextMenu={handleContextMenu}
          onRenameFolder={handleFolderRename}
          onDeleteFolder={handleFolderDelete}
          onCreateFolder={handleCreateFolder}
          onPaste={handlePaste}
          canPaste={!!clipboard?.items.length}
          onSelectAll={handleSelectAll}
          onRefresh={handleRefresh}
        />

        {/* Upload Queue Bar (Bottom Overlay) */}
        <div className="fixed bottom-0 left-0 right-0 z-[60]">
          <UploadQueueBar
            onReplaceFile={({ id, file, documentId }) => replaceFile(id, file, documentId)}
            onKeepBothFile={({ id, file }) => keepBothFile(id, file)}
            isProcessing={isProcessing}
          />
        </div>

        {/* Document Viewer Modal */}
        <AnimatePresence>
          {isViewerOpen && selectedDocument && (
            <DocumentViewer
              doc={selectedDocument}
              onClose={closeViewer}
              onDelete={() => deleteDocument(selectedDocument.id)}
              logAction={logAction}
            />
          )}
        </AnimatePresence>

        {/* Document Context Menu */}
        {contextMenu && (
          <DocumentContextMenu
            doc={contextMenu.doc}
            position={contextMenu.position}
            onClose={handleCloseContextMenu}
            onOpen={() => openViewer(contextMenu.doc as any)}
            onRename={handleRename}
            onMove={handleMove}
            onToggleFavorite={handleToggleFavorite}
            onDownload={handleDownload}
            onArchive={handleArchive}
          />
        )}
      </div>

      {/* Drag Overlay - shows document being dragged */}
      <DragOverlay>
        {draggingDoc && (
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/95 border border-cyan-500/50 rounded-xl shadow-2xl backdrop-blur-md">
            <FileText className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-medium text-white max-w-48 truncate">
              {draggingDoc.filename}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

