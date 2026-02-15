/**
 * Toolbar — Gallery Mode.
 * Clean, minimal. Actions as icon buttons.
 * Search expands inline. Sort dropdown. View toggle pill.
 */

import { FolderPlus, Upload, Grid, List, Trash2, Search, X, ArrowUpDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { SortField } from "./FileList";

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
}

export function Toolbar({
  viewMode, onViewChange, onNewFolder, onUpload, onDelete,
  selectedCount, searchQuery, onSearchChange,
  sortField, onSort, totalItems = 0,
}: ToolbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  return (
    <div className="flex items-center gap-1.5 py-2">
      {/* Actions */}
      <IconBtn icon={FolderPlus} tip="New Folder" onClick={onNewFolder} />
      <IconBtn icon={Upload} tip="Upload" onClick={onUpload} />

      {selectedCount > 0 && (
        <>
          <div className="w-px h-4 bg-white/[0.06] mx-0.5" />
          <IconBtn icon={Trash2} tip={`Delete (${selectedCount})`} onClick={onDelete} danger />
        </>
      )}

      <div className="flex-1" />

      {/* Item count */}
      <span className="text-[11px] text-zinc-600 tabular-nums mr-1">
        {selectedCount > 0 ? `${selectedCount} selected` : `${totalItems} items`}
      </span>

      {/* Sort (grid only) */}
      {viewMode === "grid" && (
        <div className="relative">
          <IconBtn icon={ArrowUpDown} tip="Sort" onClick={() => setSortOpen(!sortOpen)} />
          {sortOpen && (
            <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[140px] py-1 rounded-xl bg-zinc-900/95 backdrop-blur-xl border border-white/[0.06] shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
              {(["name", "date", "size", "type"] as SortField[]).map((f) => (
                <button
                  key={f}
                  onClick={() => { onSort?.(f); setSortOpen(false); }}
                  className={cn(
                    "w-full text-left px-3.5 py-1.5 text-[13px] hover:bg-white/[0.04] transition-colors",
                    sortField === f ? "text-cyan-400" : "text-zinc-400"
                  )}
                >
                  {f === "name" ? "Name" : f === "date" ? "Date" : f === "size" ? "Size" : "Type"}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search */}
      {searchOpen ? (
        <div className="flex items-center gap-2 bg-white/[0.03] rounded-xl px-3 py-1.5 border border-white/[0.06]">
          <Search className="w-3.5 h-3.5 text-zinc-500" />
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search…"
            className="bg-transparent text-[13px] text-zinc-200 placeholder:text-zinc-600 outline-none w-40"
          />
          <button onClick={() => { onSearchChange(""); setSearchOpen(false); }}>
            <X className="w-3 h-3 text-zinc-600 hover:text-zinc-300 transition-colors" />
          </button>
        </div>
      ) : (
        <IconBtn icon={Search} tip="Search" onClick={() => setSearchOpen(true)} />
      )}

      {/* View toggle */}
      <div className="flex items-center bg-white/[0.03] rounded-xl p-0.5 border border-white/[0.04]">
        <button
          onClick={() => onViewChange("grid")}
          className={cn(
            "p-1.5 rounded-lg transition-all",
            viewMode === "grid" ? "bg-white/[0.08] text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <Grid className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onViewChange("list")}
          className={cn(
            "p-1.5 rounded-lg transition-all",
            viewMode === "list" ? "bg-white/[0.08] text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <List className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function IconBtn({ icon: Icon, tip, onClick, danger }: {
  icon: React.ElementType; tip: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-8 h-8 flex items-center justify-center rounded-xl transition-all",
        danger
          ? "text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
          : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05]"
      )}
      title={tip}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
