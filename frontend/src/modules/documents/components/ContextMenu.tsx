/**
 * ContextMenu — unified right-click menu for files, folders, and background.
 * Single component, single dispatcher pattern.
 */

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ExternalLink, FileEdit, Trash2, FolderPlus, Upload,
  Star, StarOff, Download, FolderInput, CheckSquare,
  ArrowUpDown, Clipboard, Scissors, Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EnhancedDocument } from "../core/types";
import type { FolderTreeNode } from "../core/types/folder.types";

// --- Types ---

export type ContextTarget =
  | { kind: "doc"; doc: EnhancedDocument }
  | { kind: "folder"; folder: FolderTreeNode }
  | { kind: "background" };

export interface ContextMenuState {
  target: ContextTarget;
  position: { x: number; y: number };
}

export type ContextAction =
  | { type: "open"; docId: number }
  | { type: "rename"; id: number; kind: "doc" | "folder" }
  | { type: "delete"; id: number; kind: "doc" | "folder" }
  | { type: "toggle-favorite"; docId: number; current: boolean }
  | { type: "download"; docId: number }
  | { type: "create-subfolder"; parentId: number }
  | { type: "move"; docId: number }
  | { type: "new-folder" }
  | { type: "upload" }
  | { type: "select-all" }
  | { type: "paste" }
  | { type: "cut" }
  | { type: "copy" };

interface ContextMenuProps {
  state: ContextMenuState;
  onAction: (action: ContextAction) => void;
  onClose: () => void;
  hasClipboard?: boolean;
  selectedCount?: number;
}

export function ContextMenu({ state, onAction, onClose, hasClipboard, selectedCount = 0 }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOut = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onClickOut);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOut);
      document.removeEventListener("keydown", onEsc);
    };
  }, [onClose]);

  const pos = {
    x: Math.min(state.position.x, window.innerWidth - 220),
    y: Math.min(state.position.y, window.innerHeight - 320),
  };

  const fire = (action: ContextAction) => { onAction(action); onClose(); };

  type MenuItem = { icon: React.ElementType; label: string; onClick: () => void; danger?: boolean; shortcut?: string };
  const items: (MenuItem | "separator")[] = [];

  if (state.target.kind === "doc") {
    const doc = state.target.doc;
    const isFav = (doc as unknown as { is_favorite?: boolean }).is_favorite ?? false;
    items.push(
      { icon: ExternalLink, label: "Open", onClick: () => fire({ type: "open", docId: doc.id }), shortcut: "Enter" },
      { icon: FileEdit, label: "Rename", onClick: () => fire({ type: "rename", id: doc.id, kind: "doc" }), shortcut: "F2" },
      "separator",
      { icon: Scissors, label: "Cut", onClick: () => fire({ type: "cut" }), shortcut: "⌘X" },
      { icon: Copy, label: "Copy", onClick: () => fire({ type: "copy" }), shortcut: "⌘C" },
      "separator",
      { icon: FolderInput, label: "Move to Folder", onClick: () => fire({ type: "move", docId: doc.id }) },
      { icon: isFav ? StarOff : Star, label: isFav ? "Unfavorite" : "Favorite", onClick: () => fire({ type: "toggle-favorite", docId: doc.id, current: isFav }) },
      { icon: Download, label: "Download", onClick: () => fire({ type: "download", docId: doc.id }) },
      "separator",
      { icon: Trash2, label: "Delete", onClick: () => fire({ type: "delete", id: doc.id, kind: "doc" }), danger: true, shortcut: "Del" },
    );
  } else if (state.target.kind === "folder") {
    const folder = state.target.folder;
    items.push(
      { icon: FolderPlus, label: "Create Subfolder", onClick: () => fire({ type: "create-subfolder", parentId: folder.id }) },
      { icon: FileEdit, label: "Rename", onClick: () => fire({ type: "rename", id: folder.id, kind: "folder" }), shortcut: "F2" },
      "separator",
      { icon: Trash2, label: "Delete Folder", onClick: () => fire({ type: "delete", id: folder.id, kind: "folder" }), danger: true },
    );
  } else {
    // Background context menu
    items.push(
      { icon: FolderPlus, label: "New Folder", onClick: () => fire({ type: "new-folder" }) },
      { icon: Upload, label: "Upload Files", onClick: () => fire({ type: "upload" }) },
      "separator",
      { icon: CheckSquare, label: "Select All", onClick: () => fire({ type: "select-all" }), shortcut: "⌘A" },
    );
    if (hasClipboard) {
      items.push(
        { icon: Clipboard, label: "Paste", onClick: () => fire({ type: "paste" }), shortcut: "⌘V" },
      );
    }
  }

  // Header label
  const headerLabel = state.target.kind === "doc"
    ? state.target.doc.filename
    : state.target.kind === "folder"
      ? state.target.folder.name
      : selectedCount > 0
        ? `${selectedCount} item(s) selected`
        : "File Manager";

  return createPortal(
    <div
      ref={ref}
      style={{ left: pos.x, top: pos.y }}
      className="fixed z-[999] min-w-[220px] py-1.5 rounded-xl bg-zinc-900/95 backdrop-blur-xl border border-white/10 shadow-2xl"
    >
      <div className="px-3 py-1.5 border-b border-white/5">
        <p className="text-xs text-slate-400 truncate">{headerLabel}</p>
      </div>
      <div className="py-1">
        {items.map((item, i) =>
          item === "separator" ? (
            <div key={`sep-${i}`} className="my-1 border-t border-white/5" />
          ) : (
            <button
              key={item.label}
              onClick={item.onClick}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                item.danger ? "text-red-400 hover:bg-red-500/10" : "text-slate-300 hover:bg-white/5"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.shortcut && (
                <span className="text-[10px] text-slate-600 font-mono">{item.shortcut}</span>
              )}
            </button>
          )
        )}
      </div>
    </div>,
    document.body
  );
}
