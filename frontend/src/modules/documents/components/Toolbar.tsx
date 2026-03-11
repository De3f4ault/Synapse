/**
 * Toolbar — Square UI Files header.
 *
 * Layout: SidebarTrigger | Breadcrumb (left) | QuickActions pill (center) | Search + ViewToggle (right)
 *
 * Matches Square UI's header.tsx exactly.
 */

import { Upload, FolderPlus, Search, X, LayoutGrid, List, Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "./Breadcrumbs";
import type { SortField } from "./FileList";
import type { FolderTreeNode } from "../core/types/folder.types";

interface ToolbarProps {
  viewMode: "grid" | "list";
  onViewChange: (mode: "grid" | "list") => void;
  onNewFolder: () => void;
  onUpload: () => void;
  onDelete: () => void;
  selectedCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortField?: SortField;
  onSort?: (field: SortField) => void;
  totalItems?: number;
  // Breadcrumb props
  folderId?: number | null;
  folders?: FolderTreeNode[];
  onNavigate?: (folderId: number | null) => void;
}

export function Toolbar({
  viewMode, onViewChange, onNewFolder, onUpload, onDelete,
  selectedCount, searchQuery, onSearchChange,
  totalItems = 0,
  folderId, folders = [], onNavigate,
}: ToolbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 border-b border-border/50 bg-card sticky top-0 z-10 w-full">
      {/* ── Left: Breadcrumb ── */}
      <div className="hidden lg:block">
        <Breadcrumbs
          folderId={folderId ?? null}
          folders={folders}
          onNavigate={onNavigate ?? (() => {})}
        />
      </div>
      <div className="flex-1 lg:hidden">
        <Breadcrumbs
          folderId={folderId ?? null}
          folders={folders}
          onNavigate={onNavigate ?? (() => {})}
        />
      </div>

      {/* ── Center: QuickActions pill ── */}
      <div className="hidden lg:flex items-center gap-1 flex-1 justify-center">
        <div className="flex items-center gap-1 p-1 rounded-xl border border-border/50 bg-card">
          <ActionBtn icon={Upload} tip="Upload File" onClick={onUpload} />
          <ActionBtn icon={FolderPlus} tip="New Folder" onClick={onNewFolder} />
          {selectedCount > 0 && (
            <ActionBtn icon={Trash2} tip={`Delete (${selectedCount})`} onClick={onDelete} danger />
          )}
        </div>
      </div>

      {/* ── Right: Search + ViewToggle ── */}
      <div className="flex items-center gap-2">
        {/* Search */}
        {searchOpen ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search files..."
              className="h-9 pl-9 pr-8 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground outline-none w-48"
            />
            <button
              onClick={() => { onSearchChange(""); setSearchOpen(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
            >
              <X className="size-3.5 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="size-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Search"
          >
            <Search className="size-4" />
          </button>
        )}

        {/* Item count */}
        <span className="text-[11px] text-muted-foreground tabular-nums hidden sm:block">
          {selectedCount > 0 ? `${selectedCount} selected` : `${totalItems} items`}
        </span>

        {/* View toggle — matches Square UI exactly */}
        <div className="hidden sm:flex items-center gap-0.5 border border-border/50 rounded-lg p-0.5">
          <button
            onClick={() => onViewChange("grid")}
            className={cn(
              "size-7.5 flex items-center justify-center rounded-md transition-colors",
              viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            onClick={() => onViewChange("list")}
            className={cn(
              "size-7.5 flex items-center justify-center rounded-md transition-colors",
              viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="size-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── Action button (for QuickActions pill) ────────────────────────────────────

function ActionBtn({ icon: Icon, tip, onClick, danger }: {
  icon: React.ElementType; tip: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "size-9 flex items-center justify-center rounded-lg transition-colors",
        danger
          ? "text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
      title={tip}
    >
      <Icon className="size-4" />
    </button>
  );
}
