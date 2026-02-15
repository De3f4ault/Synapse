/**
 * FileCard — Gallery Mode.
 * Borderless, content-first. Hover lift + shadow bloom.
 * Type pill overlaid on thumbnail corner.
 */

import { GripVertical, FileText, Book, Image as ImageIcon, File } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { EnhancedDocument } from "../core/types";

interface FileCardProps {
  doc: EnhancedDocument;
  isSelected: boolean;
  thumbnailUrl?: string | null;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick?: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  isRenaming?: boolean;
  renameValue?: string;
  onRenameChange?: (value: string) => void;
  onRenameSubmit?: () => void;
  onRenameCancel?: () => void;
}

const ICON: Record<string, React.ElementType> = {
  pdf: Book, epub: Book,
  jpg: ImageIcon, jpeg: ImageIcon, png: ImageIcon, gif: ImageIcon, webp: ImageIcon,
  txt: FileText, md: FileText, docx: FileText, doc: FileText,
};

const DOT_COLOR: Record<string, string> = {
  pdf: "bg-red-400", epub: "bg-amber-400",
  jpg: "bg-purple-400", jpeg: "bg-purple-400", png: "bg-purple-400", gif: "bg-purple-400",
  md: "bg-blue-400", txt: "bg-zinc-400", docx: "bg-blue-400",
  csv: "bg-emerald-400", xlsx: "bg-emerald-400",
};

const ICON_BG: Record<string, string> = {
  pdf: "text-red-400/60 bg-red-500/8",
  epub: "text-amber-400/60 bg-amber-500/8",
  jpg: "text-purple-400/60 bg-purple-500/8",
  png: "text-purple-400/60 bg-purple-500/8",
  md: "text-blue-400/60 bg-blue-500/8",
  txt: "text-zinc-400/60 bg-zinc-500/8",
  docx: "text-blue-400/60 bg-blue-500/8",
};

export function FileCard({ doc, isSelected, thumbnailUrl, onClick, onDoubleClick, onContextMenu, isRenaming, renameValue, onRenameChange, onRenameSubmit, onRenameCancel }: FileCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `doc-${doc.id}`,
    data: { type: "document", document: doc },
  });

  const ext = doc.type?.toLowerCase() || "file";
  const Icon = ICON[ext] || File;
  const iconBg = ICON_BG[ext] || "text-zinc-400/60 bg-zinc-500/8";
  const dotColor = DOT_COLOR[ext] || "bg-zinc-500";
  const thumb = thumbnailUrl || doc.thumbnail_url;

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      className={cn(
        "group cursor-pointer rounded-2xl transition-all duration-300 relative",
        "hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]",
        isSelected
          ? "ring-2 ring-cyan-500/40 bg-cyan-500/[0.04]"
          : "hover:bg-white/[0.02]",
        isDragging && "opacity-30 scale-95"
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2.5 left-2.5 z-10 w-6 h-6 flex items-center justify-center
                   rounded-lg bg-black/50 backdrop-blur-sm text-zinc-400
                   opacity-0 group-hover:opacity-100
                   hover:text-white hover:bg-black/70 transition-all cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Preview */}
      <div className="aspect-[3/4] flex items-center justify-center overflow-hidden rounded-2xl relative bg-zinc-900/40">
        {thumb ? (
          <img src={thumb} alt={doc.filename} className="w-full h-full object-cover object-top" />
        ) : (
          <div className={cn("p-5 rounded-2xl", iconBg)}>
            <Icon className="w-10 h-10" strokeWidth={1.2} />
          </div>
        )}

        {/* Type pill — overlaid on bottom-right */}
        <span className={cn("absolute bottom-2 right-2 w-2 h-2 rounded-full", dotColor)} />

        {/* Processing indicator */}
        {doc.status === "processing" && (
          <div className="absolute top-2.5 right-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute h-full w-full rounded-full bg-cyan-400 opacity-60" />
              <span className="relative rounded-full h-2 w-2 bg-cyan-400" />
            </span>
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="px-1.5 py-2.5">
        {isRenaming ? (
          <input
            autoFocus
            type="text"
            value={renameValue ?? ""}
            onChange={(e) => onRenameChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onRenameSubmit?.();
              if (e.key === "Escape") onRenameCancel?.();
            }}
            onBlur={onRenameSubmit}
            className="w-full bg-zinc-800/80 border border-cyan-500/40 rounded-lg px-2.5 py-1.5 text-[13px] text-white outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p className="text-[13px] font-medium text-zinc-100 truncate leading-snug" title={doc.filename}>
            {doc.filename}
          </p>
        )}
        <p className="text-[11px] text-zinc-500 mt-0.5">{doc.size}</p>
      </div>
    </div>
  );
}
