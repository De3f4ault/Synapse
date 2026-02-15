/**
 * Sidebar — Gallery Mode.
 * Clean folder tree with left accent bar for active item.
 * Collapsible (narrow mode shows icons only).
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  FolderOpen, Plus, ChevronRight, Folder, RefreshCw, PanelLeftClose, PanelLeftOpen,
  Inbox, BookOpen, Image, FileText, Code2, Download, Archive, Music, Film, Briefcase,
  GraduationCap, Star, Heart, Cog, type LucideIcon,
} from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useFolderTree, useCreateFolder, useUpdateFolder, useDeleteFolder, useSeedDefaultFolders } from "../core/hooks/useFolders";
import type { FolderTreeNode } from "../core/types/folder.types";

// ─── Smart folder icon mapping ────────────────────────────────────────────────

const FOLDER_ICONS: Record<string, LucideIcon> = {
  inbox: Inbox,
  notes: FileText,
  books: BookOpen,
  media: Image,
  projects: Code2,
  exports: Download,
  archive: Archive,
  music: Music,
  videos: Film,
  work: Briefcase,
  study: GraduationCap,
  favorites: Star,
  liked: Heart,
  settings: Cog,
  programming: Code2,
  photos: Image,
  documents: FileText,
  research: GraduationCap,
  downloads: Download,
};

function getFolderIcon(name: string): LucideIcon {
  const key = name.toLowerCase().trim();
  return FOLDER_ICONS[key] || Folder;
}

interface SidebarProps {
  selectedFolderId: number | null;
  onFolderSelect: (folderId: number | null) => void;
  className?: string;
}

export function Sidebar({ selectedFolderId, onFolderSelect, className }: SidebarProps) {
  const { data: folders, isLoading, error, refetch } = useFolderTree();
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const seedFolders = useSeedDefaultFolders();
  const hasSeeded = useRef(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoading && folders && folders.length === 0 && !hasSeeded.current && !seedFolders.isPending) {
      hasSeeded.current = true;
      seedFolders.mutate();
    }
  }, [isLoading, folders, seedFolders.isPending]);

  const handleCreate = useCallback(async (parentId: number | null = null) => {
    const name = prompt(parentId ? "Subfolder name:" : "New folder name:");
    if (!name?.trim()) return;
    try {
      await createFolder.mutateAsync({ name: name.trim(), parent_id: parentId });
      toast.success(parentId ? "Subfolder created" : "Folder created");
    } catch { toast.error("Failed to create folder"); }
  }, [createFolder]);

  const handleRename = useCallback(async (folder: FolderTreeNode) => {
    const name = prompt("Rename folder:", folder.name);
    if (!name?.trim() || name === folder.name) return;
    try {
      await updateFolder.mutateAsync({ id: folder.id, name: name.trim() });
      toast.success("Folder renamed");
    } catch { toast.error("Failed to rename folder"); }
  }, [updateFolder]);

  const handleDelete = useCallback(async (folder: FolderTreeNode) => {
    if (!confirm(`Delete "${folder.name}"?\nDocuments will be moved to the parent folder.`)) return;
    try {
      await deleteFolder.mutateAsync({ id: folder.id, strategy: "promote" });
      toast.success("Folder deleted");
      if (selectedFolderId === folder.id) onFolderSelect(null);
    } catch { toast.error("Failed to delete folder"); }
  }, [deleteFolder, selectedFolderId, onFolderSelect]);

  return (
    <aside className={cn(
      "flex flex-col h-full border-r border-white/[0.04] transition-all duration-300",
      collapsed ? "w-14" : "w-56",
      className
    )} style={{ fontFamily: "'Roboto', sans-serif" }}>
      {/* Header */}
      <div className="p-3 flex items-center justify-between">
        {!collapsed && (
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Folders</span>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {!collapsed && (
            <button onClick={() => handleCreate(null)}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-zinc-600 hover:text-cyan-400 hover:bg-white/[0.04] transition-all"
              title="New folder">
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => setCollapsed(!collapsed)}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04] transition-all"
            title={collapsed ? "Expand" : "Collapse"}>
            {collapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1 px-1.5">
        <AllDocumentsItem
          isActive={selectedFolderId === null}
          onClick={() => onFolderSelect(null)}
          collapsed={collapsed}
        />

        {isLoading && (
          <div className="flex justify-center py-4">
            <RefreshCw className="w-3.5 h-3.5 text-zinc-600 animate-spin" />
          </div>
        )}

        {error && !collapsed && (
          <div className="px-3 py-2 text-[11px] text-red-400/70">
            Failed.{" "}
            <button onClick={() => refetch()} className="text-cyan-400 hover:underline">Retry</button>
          </div>
        )}

        {folders?.map((folder) => (
          <FolderNode
            key={folder.id}
            folder={folder}
            depth={0}
            selectedId={selectedFolderId}
            onSelect={onFolderSelect}
            onCreate={handleCreate}
            onRename={handleRename}
            onDelete={handleDelete}
            collapsed={collapsed}
          />
        ))}
      </div>
    </aside>
  );
}

function AllDocumentsItem({ isActive, onClick, collapsed }: { isActive: boolean; onClick: () => void; collapsed: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: "folder-root",
    data: { type: "folder", folder: { id: null, name: "All Documents" } },
  });

  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 py-2 rounded-lg transition-all duration-150 mb-0.5 relative",
        collapsed ? "px-3 justify-center" : "px-3",
        isActive
          ? "text-zinc-200"
          : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]",
        isOver && "bg-cyan-500/[0.06] text-cyan-300"
      )}
    >
      {/* Active indicator — left accent bar */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-cyan-400 rounded-full" />
      )}
      <FolderOpen className="w-4 h-4 shrink-0" />
      {!collapsed && <span className="text-[13px]">All</span>}
    </button>
  );
}

function FolderNode({
  folder, depth, selectedId, onSelect, onCreate, onRename, onDelete, collapsed,
}: {
  folder: FolderTreeNode;
  depth: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onCreate: (parentId: number) => void;
  onRename: (folder: FolderTreeNode) => void;
  onDelete: (folder: FolderTreeNode) => void;
  collapsed: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isActive = selectedId === folder.id;
  const hasChildren = folder.children.length > 0;

  const { setNodeRef, isOver } = useDroppable({
    id: `sidebar-folder-${folder.id}`,
    data: { type: "folder", folder },
  });

  const FolderIcon = getFolderIcon(folder.name);

  if (collapsed) {
    return (
      <button
        ref={setNodeRef}
        onClick={() => onSelect(folder.id)}
        className={cn(
          "w-full flex items-center justify-center py-2 rounded-lg transition-all mb-0.5 relative",
          isActive ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300",
          isOver && "bg-cyan-500/[0.06] text-cyan-300"
        )}
        title={folder.name}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-cyan-400 rounded-full" />
        )}
        <FolderIcon className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div>
      <div
        ref={setNodeRef}
        className={cn(
          "group flex items-center gap-1 py-1.5 rounded-lg cursor-pointer transition-all duration-150 text-[13px] mb-0.5 relative",
          isActive ? "text-zinc-100" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]",
          isOver && "bg-cyan-500/[0.06] text-cyan-300"
        )}
        style={{ paddingLeft: `${10 + depth * 14}px`, paddingRight: 6 }}
        onClick={() => onSelect(folder.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          const action = prompt(`Folder: ${folder.name}\n\nType action:\n1 = Create subfolder\n2 = Rename\n3 = Delete`);
          if (action === "1") onCreate(folder.id);
          else if (action === "2") onRename(folder);
          else if (action === "3") onDelete(folder);
        }}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-cyan-400 rounded-full" />
        )}

        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className={cn("w-4 h-4 flex items-center justify-center transition-transform shrink-0", !hasChildren && "invisible")}
        >
          <ChevronRight className={cn("w-3 h-3", expanded && "rotate-90")} />
        </button>
        <Folder className={cn(
          "w-3.5 h-3.5 shrink-0",
          isActive ? "text-cyan-400/70 fill-cyan-400/10" : "text-zinc-500 fill-zinc-500/5"
        )} />
        <span className="truncate flex-1 ml-1">{folder.name}</span>
        {folder.document_count > 0 && (
          <span className="text-[10px] text-zinc-600 tabular-nums">{folder.document_count}</span>
        )}
      </div>

      {expanded && hasChildren && (
        <div>
          {folder.children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onCreate={onCreate}
              onRename={onRename}
              onDelete={onDelete}
              collapsed={collapsed}
            />
          ))}
        </div>
      )}
    </div>
  );
}
