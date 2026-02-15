/**
 * FileList — Gallery Mode list view.
 * Clean rows: no visible borders, alternating subtle bg,
 * colored dots for file type, minimal columns.
 */

import { Folder, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
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
}

const DOT: Record<string, string> = {
  pdf: "bg-red-400", epub: "bg-amber-400",
  jpg: "bg-purple-400", jpeg: "bg-purple-400", png: "bg-purple-400",
  md: "bg-blue-400", txt: "bg-zinc-400", docx: "bg-blue-400",
  csv: "bg-emerald-400", xlsx: "bg-emerald-400",
};

function fmtDate(d: string | undefined | null): string {
  if (!d) return "—";
  try { return format(new Date(d), "MMM d, yyyy"); } catch { return "—"; }
}

function SortIcon({ field, active, dir }: { field: SortField; active?: SortField; dir?: SortDir }) {
  if (field !== active) return null;
  return dir === "asc"
    ? <ChevronUp className="w-3 h-3 text-cyan-400" />
    : <ChevronDown className="w-3 h-3 text-cyan-400" />;
}

export function FileList({
  documents, folders, selectedIds,
  onItemClick, onFolderOpen, onFileOpen, onContextMenu,
  sortField, sortDir, onSort,
}: FileListProps) {
  return (
    <div className="rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_80px_100px] gap-4 px-5 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">
        <button className="flex items-center gap-1 hover:text-zinc-300 transition-colors text-left" onClick={() => onSort?.("name")}>
          Name <SortIcon field="name" active={sortField} dir={sortDir} />
        </button>
        <button className="flex items-center gap-1 hover:text-zinc-300 transition-colors text-left" onClick={() => onSort?.("size")}>
          Size <SortIcon field="size" active={sortField} dir={sortDir} />
        </button>
        <button className="flex items-center gap-1 hover:text-zinc-300 transition-colors text-left" onClick={() => onSort?.("date")}>
          Modified <SortIcon field="date" active={sortField} dir={sortDir} />
        </button>
      </div>

      {/* Folder rows */}
      {folders.map((folder, i) => {
        const id = `folder:${folder.id}`;
        return (
          <div
            key={id}
            onClick={(e) => onItemClick(id, e)}
            onDoubleClick={() => onFolderOpen(folder.id)}
            onContextMenu={(e) => onContextMenu(id, "folder", e)}
            className={cn(
              "grid grid-cols-[1fr_80px_100px] gap-4 px-5 py-2.5 cursor-pointer transition-all duration-150 rounded-lg mx-1 mb-px",
              selectedIds.has(id)
                ? "bg-cyan-500/[0.06]"
                : i % 2 === 0 ? "hover:bg-white/[0.03]" : "bg-white/[0.015] hover:bg-white/[0.04]"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Folder className="w-4 h-4 text-cyan-500/70 fill-cyan-400/10 shrink-0" />
              <span className="text-[13px] text-zinc-200 truncate">{folder.name}</span>
            </div>
            <span className="text-[13px] text-zinc-600">—</span>
            <span className="text-[13px] text-zinc-600">—</span>
          </div>
        );
      })}

      {/* Document rows */}
      {documents.map((doc, i) => {
        const id = `doc:${doc.id}`;
        const ext = doc.type?.toLowerCase() || "";
        const idx = folders.length + i;
        return (
          <div
            key={id}
            onClick={(e) => onItemClick(id, e)}
            onDoubleClick={() => onFileOpen(doc.id)}
            onContextMenu={(e) => onContextMenu(id, "doc", e)}
            className={cn(
              "group grid grid-cols-[1fr_80px_100px] gap-4 px-5 py-2.5 cursor-pointer transition-all duration-150 rounded-lg mx-1 mb-px",
              selectedIds.has(id)
                ? "bg-cyan-500/[0.06]"
                : idx % 2 === 0 ? "hover:bg-white/[0.03]" : "bg-white/[0.015] hover:bg-white/[0.04]"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className={cn("w-2 h-2 rounded-full shrink-0", DOT[ext] || "bg-zinc-500")} />
              <span className="text-[13px] text-zinc-200 truncate">{doc.filename}</span>
            </div>
            <span className="text-[13px] text-zinc-400">{doc.size}</span>
            <span className="text-[13px] text-zinc-500 group-hover:text-zinc-300 transition-colors">{fmtDate(doc.updated_at)}</span>
          </div>
        );
      })}

      {folders.length === 0 && documents.length === 0 && (
        <div className="py-16 text-center text-[13px] text-zinc-600">
          This folder is empty.
        </div>
      )}
    </div>
  );
}
