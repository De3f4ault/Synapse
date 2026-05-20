/**
 * Sidebar — Square UI Files layout.
 *
 * Structure (top → bottom):
 *   1. Header: "Synapse Drive" branding
 *   2. "+ New" button (dropdown: Upload File, New Folder)
 *   3. Smart views: All Files, Starred, Recent, Trash
 *   4. Collapsible FOLDERS section with colored icons + doc counts
 *   5. Storage progress bar card
 *   6. Footer: user info (omitted for now — already in global nav)
 *
 * Preserves: useDroppable for DnD, folder CRUD, auto-seed.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  FolderClosed, Plus, ChevronDown, RefreshCw,
  Home, Star, Clock, Trash2, Upload, FolderPlus,
  HardDrive,
} from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useFolderTree, useCreateFolder, useDeleteFolder, useSeedDefaultFolders,
} from "../core/hooks/useFolders";
import type { FolderTreeNode } from "../core/types/folder.types";

// ─── Smart views (matching Square UI) ─────────────────────────────────────────

type SmartView = "all" | "starred" | "recent" | "trash" | null;

const SMART_VIEWS: { id: SmartView; icon: React.ElementType; label: string }[] = [
  { id: "all",     icon: Home,   label: "All Files" },
  { id: "starred", icon: Star,   label: "Starred" },
  { id: "recent",  icon: Clock,  label: "Recent" },
  { id: "trash",   icon: Trash2, label: "Trash" },
];

// ─── Default folder colors ───────────────────────────────────────────────────

const DEFAULT_FOLDER_COLORS = [
  "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4",
  "#10B981", "#6366F1", "#EF4444", "#14B8A6",
];

function getFolderColor(folder: FolderTreeNode): string {
  const color = folder.settings?.color as string | undefined;
  if (color) return color;
  return DEFAULT_FOLDER_COLORS[folder.id % DEFAULT_FOLDER_COLORS.length]!;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SidebarProps {
  selectedFolderId: number | null;
  onFolderSelect: (folderId: number | null) => void;
  smartView?: SmartView;
  onSmartViewSelect?: (view: SmartView) => void;
  className?: string;
}

export function Sidebar({
  selectedFolderId, onFolderSelect, smartView, onSmartViewSelect, className,
}: SidebarProps) {
  const { data: folders, isLoading, error, refetch } = useFolderTree();
  const createFolder = useCreateFolder();
  const deleteFolder = useDeleteFolder();
  const seedFolders = useSeedDefaultFolders();
  const hasSeeded = useRef(false);
  const [foldersOpen, setFoldersOpen] = useState(true);
  const [newDropdownOpen, setNewDropdownOpen] = useState(false);

  // Auto-seed default folders on first load
  useEffect(() => {
    if (!isLoading && folders && folders.length === 0 && !hasSeeded.current && !seedFolders.isPending) {
      hasSeeded.current = true;
      seedFolders.mutate();
    }
  }, [isLoading, folders, seedFolders.isPending]);

  const handleCreateFolder = useCallback(async (parentId: number | null = null) => {
    const name = prompt(parentId ? "Subfolder name:" : "New folder name:");
    if (!name?.trim()) return;
    try {
      await createFolder.mutateAsync({ name: name.trim(), parent_id: parentId });
      toast.success(parentId ? "Subfolder created" : "Folder created");
    } catch { toast.error("Failed to create folder"); }
  }, [createFolder]);

  const handleDelete = useCallback(async (folder: FolderTreeNode) => {
    if (!confirm(`Delete "${folder.name}"?\nDocuments will be moved to the parent folder.`)) return;
    try {
      await deleteFolder.mutateAsync({ id: folder.id, strategy: "promote" });
      toast.success("Folder deleted");
      if (selectedFolderId === folder.id) onFolderSelect(null);
    } catch { toast.error("Failed to delete folder"); }
  }, [deleteFolder, selectedFolderId, onFolderSelect]);

  const handleUpload = useCallback(() => {
    // Trigger upload — dispatched via onSmartViewSelect or parent callback
    toast.info("Use the upload area or drag files into the content area.");
    setNewDropdownOpen(false);
  }, []);

  return (
    <aside className={cn(
      "flex flex-col h-full w-56 shrink-0 bg-sidebar border-r border-border/40",
      className,
    )}>
      {/* ── Header: branding ── */}
      <div className="p-4 pb-0">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
            <HardDrive className="size-4 text-foreground" />
          </div>
          <span className="font-semibold text-base text-foreground">Synapse Drive</span>
        </div>
      </div>

      <div className="px-4 pt-6 flex flex-col flex-1 overflow-hidden">
        {/* ── + New button ── */}
        <div className="relative mb-4">
          <button
            onClick={() => setNewDropdownOpen(!newDropdownOpen)}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" />
            New
          </button>
          {newDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNewDropdownOpen(false)} />
              <div className="absolute left-0 top-full mt-1 z-50 w-48 py-1 rounded-xl border bg-popover shadow-lg">
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
                  onClick={() => { handleUpload(); }}
                >
                  <Upload className="size-4" /> Upload File
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
                  onClick={() => { handleCreateFolder(null); setNewDropdownOpen(false); }}
                >
                  <FolderPlus className="size-4" /> New Folder
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Smart views ── */}
        <nav className="space-y-0.5">
          {SMART_VIEWS.map((view) => {
            const isActive = smartView === view.id || (view.id === "all" && !smartView && selectedFolderId === null);
            return (
              <button
                key={view.id}
                onClick={() => {
                  if (view.id === "all") {
                    onFolderSelect(null);
                    onSmartViewSelect?.(null);
                  } else {
                    onSmartViewSelect?.(view.id);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <view.icon className="size-4 shrink-0" />
                <span>{view.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ── Folders section (collapsible) ── */}
        <div className="mt-4">
          <button
            onClick={() => setFoldersOpen(!foldersOpen)}
            className="w-full flex items-center justify-between h-6 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="flex items-center gap-1">
              <ChevronDown className={cn("size-3 transition-transform", !foldersOpen && "-rotate-90")} />
              <span>Folders</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleCreateFolder(null); }}
              className="size-5 flex items-center justify-center rounded hover:bg-accent"
            >
              <Plus className="size-3" />
            </button>
          </button>

          {foldersOpen && (
            <div className="mt-1.5 space-y-0.5">
              {isLoading && (
                <div className="flex justify-center py-4">
                  <RefreshCw className="size-3.5 text-muted-foreground animate-spin" />
                </div>
              )}

              {error && (
                <div className="px-2 py-2 text-[11px] text-destructive">
                  Failed.{" "}
                  <button onClick={() => refetch()} className="text-primary hover:underline">Retry</button>
                </div>
              )}

              {folders?.map((folder) => (
                <SidebarFolderItem
                  key={folder.id}
                  folder={folder}
                  isActive={selectedFolderId === folder.id}
                  onSelect={onFolderSelect}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* ── Storage card (at bottom of content) ── */}
        <div className="mt-4 p-3 rounded-xl border border-border/50 bg-card mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Storage</span>
            <span className="text-xs text-muted-foreground">
              — / 15 GB
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
            <div className="h-full rounded-full bg-primary w-0 transition-all" />
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              { type: "Images", color: "#8B5CF6" },
              { type: "Videos", color: "#EC4899" },
              { type: "Documents", color: "#F59E0B" },
            ].map((item) => (
              <div key={item.type} className="flex items-center gap-1.5">
                <div className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] text-muted-foreground">{item.type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Folder item ──────────────────────────────────────────────────────────────

function SidebarFolderItem({
  folder, isActive, onSelect, onDelete,
}: {
  folder: FolderTreeNode;
  isActive: boolean;
  onSelect: (id: number) => void;
  onDelete: (folder: FolderTreeNode) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `sidebar-folder-${folder.id}`,
    data: { type: "folder", folder },
  });

  const color = getFolderColor(folder);

  return (
    <button
      ref={setNodeRef}
      onClick={() => onSelect(folder.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        if (confirm(`Delete "${folder.name}"?`)) onDelete(folder);
      }}
      className={cn(
        "w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-sm transition-colors",
        isActive
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
        isOver && "bg-primary/10 text-primary ring-1 ring-primary/30"
      )}
    >
      <FolderClosed className="size-4 shrink-0" style={{ color }} />
      <span className="flex-1 text-left truncate">{folder.name}</span>
      {folder.document_count > 0 && (
        <span className="text-xs text-muted-foreground">{folder.document_count}</span>
      )}
    </button>
  );
}
