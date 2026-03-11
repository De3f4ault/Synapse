/**
 * FileList — Table/list view with Square UI aesthetic.
 *
 * Rounded card wrapper, muted header row, FileIcon per row,
 * star toggle + more menu on hover.
 */

import { Folder, ChevronUp, ChevronDown, Star, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { FileIcon, getFileColor } from "./FileIcon";
import type { EnhancedDocument } from "../core/types";
import type { FolderTreeNode } from "../core/types/folder.types";

export type SortField = "name" | "size" | "date" | "type";
export type SortDir = "asc" | "desc";

interface FileListProps {
  documents: EnhancedDocument[];
  folders: FolderTreeNode[];
  selectedIds: Set<string>;
  onItemClick: (id: string, e: React.MouseEvent) => void;
  onFolderOpen: (folderId: number) => void;
  onFileOpen: (docId: number) => void;
  onContextMenu: (id: string, kind: "doc" | "folder", e: React.MouseEvent) => void;
  sortField?: SortField;
  sortDir?: SortDir;
  onSort?: (field: SortField) => void;
  onToggleFavorite?: (docId: number) => void;
}

/** Default palette for folders that have no color set */
const DEFAULT_FOLDER_COLORS = [
  "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4",
  "#10B981", "#6366F1", "#EF4444", "#14B8A6",
];

function fmtDate(d: string | undefined | null): string {
  if (!d) return "—";
  try { return format(new Date(d), "MMM d, yyyy"); } catch { return "—"; }
}

function SortIcon({ field, active, dir }: { field: SortField; active?: SortField; dir?: SortDir }) {
  if (field !== active) return null;
  return dir === "asc"
    ? <ChevronUp className="size-3 text-primary" />
    : <ChevronDown className="size-3 text-primary" />;
}

export function FileList({
  documents, folders, selectedIds,
  onItemClick, onFolderOpen, onFileOpen, onContextMenu,
  sortField, sortDir, onSort, onToggleFavorite,
}: FileListProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_100px_120px_70px] gap-4 px-4 py-2.5 bg-muted/50 text-[11px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50">
        <button className="flex items-center gap-1 hover:text-foreground transition-colors text-left" onClick={() => onSort?.("name")}>
          Name <SortIcon field="name" active={sortField} dir={sortDir} />
        </button>
        <button className="flex items-center gap-1 hover:text-foreground transition-colors text-left" onClick={() => onSort?.("size")}>
          Size <SortIcon field="size" active={sortField} dir={sortDir} />
        </button>
        <button className="flex items-center gap-1 hover:text-foreground transition-colors text-left" onClick={() => onSort?.("date")}>
          Modified <SortIcon field="date" active={sortField} dir={sortDir} />
        </button>
        <span />
      </div>

      {/* Folder rows */}
      {folders.map((folder) => {
        const id = `folder:${folder.id}`;
        const folderColor = folder.settings?.color || DEFAULT_FOLDER_COLORS[folder.id % DEFAULT_FOLDER_COLORS.length];
        return (
          <div
            key={id}
            onClick={(e) => onItemClick(id, e)}
            onDoubleClick={() => onFolderOpen(folder.id)}
            onContextMenu={(e) => onContextMenu(id, "folder", e)}
            className={cn(
              "group grid grid-cols-[1fr_100px_120px_70px] gap-4 px-4 py-2.5 cursor-pointer transition-colors border-b border-border/30 last:border-0",
              selectedIds.has(id)
                ? "bg-primary/[0.06]"
                : "hover:bg-muted/30"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="size-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${folderColor}15` }}
              >
                <Folder className="size-4" style={{ color: folderColor }} fill={`${folderColor}30`} />
              </div>
              <span className="text-[13px] font-medium text-foreground truncate">{folder.name}</span>
            </div>
            <span className="text-[13px] text-muted-foreground self-center">—</span>
            <span className="text-[13px] text-muted-foreground self-center">—</span>
            <span />
          </div>
        );
      })}

      {/* Document rows */}
      {documents.map((doc) => {
        const id = `doc:${doc.id}`;
        const ext = doc.type?.toLowerCase() || "";
        const isFavorite = !!(doc as any).is_favorite;

        return (
          <div
            key={id}
            onClick={(e) => onItemClick(id, e)}
            onDoubleClick={() => onFileOpen(doc.id)}
            onContextMenu={(e) => onContextMenu(id, "doc", e)}
            className={cn(
              "group grid grid-cols-[1fr_100px_120px_70px] gap-4 px-4 py-2.5 cursor-pointer transition-colors border-b border-border/30 last:border-0",
              selectedIds.has(id)
                ? "bg-primary/[0.06]"
                : "hover:bg-muted/30"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <FileIcon type={ext} size="sm" />
              <span className="text-[13px] text-foreground truncate">{doc.filename}</span>
            </div>
            <span className="text-[13px] text-muted-foreground self-center">{doc.size}</span>
            <span className="text-[13px] text-muted-foreground self-center">{fmtDate(doc.updated_at)}</span>
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(doc.id); }}
                className={cn(
                  "size-6 flex items-center justify-center rounded-md transition-all",
                  isFavorite
                    ? "text-amber-400"
                    : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-amber-400"
                )}
              >
                <Star className="size-3.5" fill={isFavorite ? "currentColor" : "none"} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onContextMenu(id, "doc", e); }}
                className="size-6 flex items-center justify-center rounded-md text-muted-foreground
                           opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-muted/50 transition-all"
              >
                <MoreVertical className="size-3.5" />
              </button>
            </div>
          </div>
        );
      })}

      {folders.length === 0 && documents.length === 0 && (
        <div className="py-16 text-center text-[13px] text-muted-foreground">
          This folder is empty.
        </div>
      )}
    </div>
  );
}
