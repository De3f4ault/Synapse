/**
 * DocumentsPage — Orchestrator.
 *
 * Owns: layout, DndContext, selection, keyboard shortcuts,
 *       clipboard, inline rename, sort, unified command dispatcher.
 * Delegates: folder CRUD → Sidebar, rendering → FileGrid/FileList.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext, DragOverlay, closestCenter,
  PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";

// Hooks (all preserved, clean)
import { useDocuments } from "./list/hooks/useDocuments";
import { useFolderTree, useFolderSubtree, useCreateFolder } from "@/modules/documents/core/hooks/useFolders";
import { useUpdateDocument, useToggleFavorite, useRenameDocument, useDownloadDocument } from "@/modules/documents/core/hooks/useDocumentActions";
import { useThumbnails } from "@/modules/documents/hooks/useThumbnails";
import { useFolderStore } from "@/modules/documents/core/state/folderStore";
import { useListStore } from "./list/state/listStore";

// Components (all new)
import { Sidebar } from "@/modules/documents/components/Sidebar";
import { Toolbar } from "@/modules/documents/components/Toolbar";
import { FileGrid } from "@/modules/documents/components/FileGrid";
import { FileList, type SortField, type SortDir } from "@/modules/documents/components/FileList";
import { ContextMenu, type ContextMenuState, type ContextAction } from "@/modules/documents/components/ContextMenu";

// Upload (preserved)
import { UploadArea } from "./upload/components/UploadArea";
import { UploadQueueBar } from "./upload/components/UploadQueueBar";
import { useDocumentUpload } from "./upload/hooks/useDocumentUpload";

// Types
import type { EnhancedDocument } from "@/modules/documents/core/types";
import type { FolderTreeNode } from "@/modules/documents/core/types/folder.types";

// New widgets
import { StorageOverview } from "@/modules/documents/components/StorageOverview";
import { RecentActivity } from "@/modules/documents/components/RecentActivity";
import { EmptyState } from "@/modules/documents/components/EmptyState";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClipboardState {
  ids: string[];
  mode: "copy" | "cut";
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DocumentsPage() {
  const navigate = useNavigate();

  // --- Core state ---
  const { selectedFolderId, selectFolder } = useFolderStore();
  const { viewMode, setViewMode, filters, setSearch } = useListStore();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [smartView, setSmartView] = useState<"all" | "starred" | "recent" | "trash" | null>(null);

  // Clipboard (survives folder navigation as per user spec)
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);

  // Inline rename
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Sort
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // DnD
  const [draggingDoc, setDraggingDoc] = useState<EnhancedDocument | null>(null);

  // Upload hook
  const upload = useDocumentUpload();

  // Ref for keyboard event target filtering
  const mainRef = useRef<HTMLDivElement>(null);

  // --- Data ---
  const { documents, isLoading, refetch, deleteDocument } = useDocuments({ folderId: selectedFolderId });
  const { data: folderTree = [] } = useFolderTree();
  const { data: currentFolders = [] } = useFolderSubtree(selectedFolderId);
  const thumbnails = useThumbnails(documents.map((d) => d.id));

  // --- Mutations ---
  const updateDocument = useUpdateDocument();
  const toggleFavorite = useToggleFavorite();
  const renameDoc = useRenameDocument();
  const downloadDoc = useDownloadDocument();
  const createFolder = useCreateFolder();

  // ─── Sorting & Filtering ─────────────────────────────────────────────────

  const filteredAndSortedDocs = useMemo(() => {
    let docs = [...documents];

    // Filter by search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      docs = docs.filter((d) => d.filename.toLowerCase().includes(q));
    }

    // Sort
    docs.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name": cmp = a.filename.localeCompare(b.filename); break;
        case "size": cmp = (a.file_size ?? 0) - (b.file_size ?? 0); break;
        case "date": cmp = (a.updated_at ?? "").localeCompare(b.updated_at ?? ""); break;
        case "type": cmp = (a.type ?? "").localeCompare(b.type ?? ""); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return docs;
  }, [documents, filters.search, sortField, sortDir]);

  // Sort handler (toggles direction if same field)
  const handleSort = useCallback((field: SortField) => {
    setSortDir((prev) => (sortField === field ? (prev === "asc" ? "desc" : "asc") : "asc"));
    setSortField(field);
  }, [sortField]);

  // ─── DnD ──────────────────────────────────────────────────────────────────

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === "document") {
      setDraggingDoc(data.document as EnhancedDocument);
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setDraggingDoc(null);
    const { active, over } = event;
    if (!over) return;

    const overData = over.data.current;
    if (overData?.type !== "folder") return;

    const folderId = (overData.folder as FolderTreeNode).id;
    const activeData = active.data.current;

    if (activeData?.type === "document") {
      const doc = activeData.document as EnhancedDocument;
      // Multi-drag: if this doc is selected, move ALL selected docs
      const idsToMove = selectedIds.has(`doc:${doc.id}`)
        ? [...selectedIds].filter((id) => id.startsWith("doc:")).map((id) => Number(id.split(":")[1]))
        : [doc.id];

      try {
        await Promise.all(
          idsToMove.map((id) =>
            updateDocument.mutateAsync({ id, folder_id: folderId } as any)
          )
        );
        toast.success(`Moved ${idsToMove.length} file(s)`);
        setSelectedIds(new Set());
        refetch();
      } catch {
        toast.error("Failed to move files");
      }
    }
  }, [selectedIds, refetch, updateDocument]);

  // ─── Selection ────────────────────────────────────────────────────────────

  const allItemIds = useMemo(() => {
    const ids: string[] = [];
    currentFolders.forEach((f) => ids.push(`folder:${f.id}`));
    filteredAndSortedDocs.forEach((d) => ids.push(`doc:${d.id}`));
    return ids;
  }, [currentFolders, filteredAndSortedDocs]);

  const handleItemClick = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (e.ctrlKey || e.metaKey) {
        next.has(id) ? next.delete(id) : next.add(id);
      } else if (e.shiftKey && lastClickedId) {
        const startIdx = allItemIds.indexOf(lastClickedId);
        const endIdx = allItemIds.indexOf(id);
        if (startIdx >= 0 && endIdx >= 0) {
          const [lo, hi] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
          for (let i = lo; i <= hi; i++) next.add(allItemIds[i]!);
        }
      } else {
        next.clear();
        next.add(id);
      }
      return next;
    });
    setLastClickedId(id);
  }, [lastClickedId, allItemIds]);

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedIds(new Set());
      setContextMenu(null);
      setRenamingId(null);
    }
  }, []);

  // ─── Context Menu ─────────────────────────────────────────────────────────

  const handleContextMenu = useCallback(
    (id: string, kind: "doc" | "folder", e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      let target: ContextMenuState["target"];
      if (kind === "doc") {
        const doc = documents.find((d) => d.id === Number(id.split(":")[1]));
        if (!doc) return;
        target = { kind: "doc", doc };
      } else {
        const folder = currentFolders.find((f) => f.id === Number(id.split(":")[1]));
        if (!folder) return;
        target = { kind: "folder", folder };
      }

      // Auto-select item if not already selected
      if (!selectedIds.has(id)) {
        setSelectedIds(new Set([id]));
      }

      setContextMenu({ target, position: { x: e.clientX, y: e.clientY } });
    },
    [documents, currentFolders, selectedIds]
  );

  const handleBackgroundContextMenu = useCallback((e: React.MouseEvent) => {
    // Only fire if clicking the background itself or the scrollable area
    const target = e.target as HTMLElement;
    const isBackground = target === e.currentTarget || target.closest("[data-file-area]") === e.currentTarget;
    if (!isBackground) return;

    e.preventDefault();
    setContextMenu({
      target: { kind: "background" },
      position: { x: e.clientX, y: e.clientY },
    });
  }, []);

  // ─── Command Dispatcher ───────────────────────────────────────────────────
  // All actions flow through here: context menu, toolbar, keyboard shortcuts.

  const executeCommand = useCallback(
    (action: ContextAction) => {
      switch (action.type) {
        case "open": {
          const doc = documents.find((d) => d.id === action.docId);
          if (doc) navigate(`/documents/${doc.id}`);
          break;
        }

        case "rename": {
          if (action.kind === "doc") {
            const doc = documents.find((d) => d.id === action.id);
            if (doc) {
              // Extract base name (without extension) for safe rename
              const lastDot = doc.filename.lastIndexOf(".");
              const baseName = lastDot > 0 ? doc.filename.substring(0, lastDot) : doc.filename;
              setRenamingId(`doc:${doc.id}`);
              setRenameValue(baseName);
            }
          }
          break;
        }

        case "delete": {
          if (action.kind === "doc") {
            // Delete all selected docs if the target is selected
            const docIds = selectedIds.has(`doc:${action.id}`)
              ? [...selectedIds].filter((id) => id.startsWith("doc:")).map((id) => Number(id.split(":")[1]))
              : [action.id];

            if (confirm(`Delete ${docIds.length} file(s)?`)) {
              docIds.forEach((id) => deleteDocument(id));
              setSelectedIds(new Set());
            }
          }
          break;
        }

        case "toggle-favorite":
          toggleFavorite.mutate(action.docId, action.current);
          break;

        case "download":
          downloadDoc.mutate(action.docId);
          break;

        case "move":
          toast.info("Drag the file to a folder to move it.");
          break;

        case "new-folder": {
          const name = prompt("Folder name:");
          if (name?.trim()) {
            createFolder.mutate(
              { name: name.trim(), parent_id: selectedFolderId },
              { onSuccess: () => toast.success("Folder created"), onError: () => toast.error("Failed") }
            );
          }
          break;
        }

        case "upload":
          setShowUpload(true);
          break;

        case "select-all":
          setSelectedIds(new Set(allItemIds));
          break;

        case "cut":
          if (selectedIds.size > 0) {
            setClipboard({ ids: [...selectedIds], mode: "cut" });
            toast.info(`${selectedIds.size} item(s) cut`);
          }
          break;

        case "copy":
          if (selectedIds.size > 0) {
            setClipboard({ ids: [...selectedIds], mode: "copy" });
            toast.info(`${selectedIds.size} item(s) copied`);
          }
          break;

        case "paste":
          if (clipboard) {
            if (clipboard.mode === "cut") {
              const docIds = clipboard.ids
                .filter((id) => id.startsWith("doc:"))
                .map((id) => Number(id.split(":")[1]));

              Promise.all(
                docIds.map((id) =>
                  updateDocument.mutateAsync({ id, folder_id: selectedFolderId } as any)
                )
              ).then(() => {
                toast.success(`Moved ${docIds.length} file(s)`);
                setClipboard(null); // Clear after cut+paste
                refetch();
              }).catch(() => toast.error("Failed to paste"));
            } else {
              toast.info("Copy is not yet supported for documents.");
            }
          }
          break;

        case "create-subfolder": {
          const subName = prompt("Subfolder name:");
          if (subName?.trim()) {
            createFolder.mutate(
              { name: subName.trim(), parent_id: action.parentId },
              { onSuccess: () => toast.success("Subfolder created"), onError: () => toast.error("Failed") }
            );
          }
          break;
        }
      }
    },
    [documents, selectedIds, deleteDocument, toggleFavorite, downloadDoc,
     createFolder, selectedFolderId, clipboard, updateDocument, refetch,
     navigate, allItemIds]
  );

  // ─── Inline Rename ────────────────────────────────────────────────────────

  const handleRenameSubmit = useCallback(() => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    const docId = Number(renamingId.split(":")[1]);
    const doc = documents.find((d) => d.id === docId);
    if (!doc) { setRenamingId(null); return; }

    // Re-attach extension
    const lastDot = doc.filename.lastIndexOf(".");
    const ext = lastDot > 0 ? doc.filename.substring(lastDot) : "";
    const newName = renameValue.trim() + ext;

    if (newName !== doc.filename) {
      renameDoc.mutate(docId, newName);
    }
    setRenamingId(null);
  }, [renamingId, renameValue, documents, renameDoc]);

  const handleRenameCancel = useCallback(() => {
    setRenamingId(null);
  }, []);

  // ─── Keyboard Shortcuts ───────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const isMod = e.ctrlKey || e.metaKey;

      switch (e.key) {
        case "Delete":
        case "Backspace": {
          if (selectedIds.size === 0) return;
          e.preventDefault();
          const docIds = [...selectedIds].filter((id) => id.startsWith("doc:")).map((id) => Number(id.split(":")[1]));
          if (docIds.length > 0 && confirm(`Delete ${docIds.length} file(s)?`)) {
            docIds.forEach((id) => deleteDocument(id));
            setSelectedIds(new Set());
          }
          break;
        }

        case "a":
          if (isMod) {
            e.preventDefault();
            setSelectedIds(new Set(allItemIds));
          }
          break;

        case "F2": {
          e.preventDefault();
          if (selectedIds.size === 1) {
            const id = [...selectedIds][0]!;
            if (id.startsWith("doc:")) {
              const docId = Number(id.split(":")[1]);
              executeCommand({ type: "rename", id: docId, kind: "doc" });
            }
          }
          break;
        }

        case "Escape":
          e.preventDefault();
          setSelectedIds(new Set());
          setContextMenu(null);
          setRenamingId(null);
          break;

        case "Enter": {
          e.preventDefault();
          if (selectedIds.size === 1) {
            const id = [...selectedIds][0]!;
            if (id.startsWith("doc:")) {
              navigate(`/documents/${Number(id.split(":")[1])}`);
            } else if (id.startsWith("folder:")) {
              selectFolder(Number(id.split(":")[1]));
              setSelectedIds(new Set());
            }
          }
          break;
        }

        case "c":
          if (isMod && selectedIds.size > 0) {
            e.preventDefault();
            executeCommand({ type: "copy" });
          }
          break;

        case "x":
          if (isMod && selectedIds.size > 0) {
            e.preventDefault();
            executeCommand({ type: "cut" });
          }
          break;

        case "v":
          if (isMod && clipboard) {
            e.preventDefault();
            executeCommand({ type: "paste" });
          }
          break;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selectedIds, allItemIds, clipboard, deleteDocument, executeCommand, navigate, selectFolder]);

  // ─── Toolbar Actions ──────────────────────────────────────────────────────

  const handleDelete = useCallback(() => {
    const docIds = [...selectedIds].filter((id) => id.startsWith("doc:")).map((id) => Number(id.split(":")[1]));
    if (docIds.length === 0) return;
    if (!confirm(`Delete ${docIds.length} file(s)?`)) return;
    docIds.forEach((id) => deleteDocument(id));
    setSelectedIds(new Set());
  }, [selectedIds, deleteDocument]);

  const handleFolderNavigate = useCallback((folderId: number | null) => {
    selectFolder(folderId);
    setSelectedIds(new Set());
    setRenamingId(null);
  }, [selectFolder]);

  const handleFileOpen = useCallback((docId: number) => {
    navigate(`/documents/${docId}`);
  }, [navigate]);

  // ─── Render ───────────────────────────────────────────────────────────────

  const dragCount = draggingDoc && selectedIds.has(`doc:${draggingDoc.id}`)
    ? [...selectedIds].filter((id) => id.startsWith("doc:")).length
    : 1;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-[calc(100vh-64px)]" ref={mainRef}>
        {/* ── Sidebar (Square UI style) ── */}
        <Sidebar
          selectedFolderId={selectedFolderId}
          onFolderSelect={handleFolderNavigate}
          smartView={smartView}
          onSmartViewSelect={setSmartView}
        />

        {/* ── Main content area (lg:p-2 wrapping rounded-xl container) ── */}
        <div className="h-full overflow-hidden lg:p-2 w-full">
          <div className="lg:border lg:border-border/50 lg:rounded-xl overflow-hidden flex flex-col items-center justify-start h-full w-full bg-background">
            {/* Header/Toolbar (sticky) */}
            <Toolbar
              viewMode={viewMode}
              onViewChange={setViewMode}
              onNewFolder={() => executeCommand({ type: "new-folder" })}
              onUpload={() => setShowUpload(true)}
              onDelete={handleDelete}
              selectedCount={selectedIds.size}
              searchQuery={filters.search}
              onSearchChange={setSearch}
              totalItems={currentFolders.length + filteredAndSortedDocs.length}
              folderId={selectedFolderId}
              folders={folderTree}
              onNavigate={handleFolderNavigate}
            />

            {/* File view area — background context menu fires here */}
            <div
              className="flex-1 overflow-y-auto w-full"
              data-file-area
              onContextMenu={handleBackgroundContextMenu}
              onClick={handleBackgroundClick}
            >
              <div className="flex flex-col xl:flex-row gap-6 p-4 md:p-6">
                {/* ── Main content ── */}
                <div className="flex-1 space-y-6 min-w-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                      Loading...
                    </div>
                  ) : currentFolders.length === 0 && filteredAndSortedDocs.length === 0 ? (
                    <EmptyState
                      view={filters.search ? "search" : "folder"}
                    />
                  ) : viewMode === "grid" ? (
                    <FileGrid
                      documents={filteredAndSortedDocs}
                      folders={currentFolders}
                      selectedIds={selectedIds}
                      thumbnails={thumbnails.data ?? {}}
                      onItemClick={handleItemClick}
                      onFolderOpen={handleFolderNavigate}
                      onFileOpen={handleFileOpen}
                      onContextMenu={handleContextMenu}
                      renamingId={renamingId}
                      renameValue={renameValue}
                      onRenameChange={setRenameValue}
                      onRenameSubmit={handleRenameSubmit}
                      onRenameCancel={handleRenameCancel}
                      onToggleFavorite={(id) => toggleFavorite.mutate(id, false)}
                    />
                  ) : (
                    <FileList
                      documents={filteredAndSortedDocs}
                      folders={currentFolders}
                      selectedIds={selectedIds}
                      onItemClick={handleItemClick}
                      onFolderOpen={handleFolderNavigate}
                      onFileOpen={handleFileOpen}
                      onContextMenu={handleContextMenu}
                      sortField={sortField}
                      sortDir={sortDir}
                      onSort={handleSort}
                      onToggleFavorite={(id) => toggleFavorite.mutate(id, false)}
                    />
                  )}
                </div>

                {/* ── Right panel (xl:w-80, only on "all" view) ── */}
                {selectedFolderId === null && !smartView && (
                  <div className="w-full xl:w-80 shrink-0 space-y-4">
                    <StorageOverview data={[]} isLoading={false} />
                    <RecentActivity data={[]} isLoading={false} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Drag overlay — shows ghost card while dragging */}
        <DragOverlay dropAnimation={null}>
          {draggingDoc && (
            <div className="px-4 py-2 rounded-lg bg-card/90 backdrop-blur-sm border border-primary/30 shadow-xl text-sm text-foreground flex items-center gap-2 pointer-events-none">
              <span className="truncate max-w-[200px]">{draggingDoc.filename}</span>
              {dragCount > 1 && (
                <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {dragCount}
                </span>
              )}
            </div>
          )}
        </DragOverlay>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          state={contextMenu}
          onAction={executeCommand}
          onClose={() => setContextMenu(null)}
          hasClipboard={!!clipboard}
          selectedCount={selectedIds.size}
        />
      )}

      {/* Upload integration */}
      {showUpload && (
        <UploadArea
          getRootProps={upload.getRootProps}
          getInputProps={upload.getInputProps}
          isDragActive={upload.isDragActive}
          onCancel={() => setShowUpload(false)}
        />
      )}
      <UploadQueueBar
        onReplaceFile={() => upload.handleReplace()}
        onKeepBothFile={() => upload.handleKeepBoth()}
        isProcessing={upload.isUploading}
      />
    </DndContext>
  );
}
