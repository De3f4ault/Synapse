/**
 * FileCard — Gallery Mode.
 *
 * Square UI aesthetic: rounded-xl card, tinted FileIcon background,
 * star toggle, hover action dropdown.
 * Preserves: thumbnails, drag handle, processing indicator, inline rename.
 */

import { GripVertical, Star, MoreVertical } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { FileIcon } from "./FileIcon";
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
  onToggleFavorite?: (docId: number) => void;
}

export function FileCard({
  doc, isSelected, thumbnailUrl, onClick, onDoubleClick, onContextMenu,
  isRenaming, renameValue, onRenameChange, onRenameSubmit, onRenameCancel,
  onToggleFavorite,
}: FileCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `doc-${doc.id}`,
    data: { type: "document", document: doc },
  });

  const ext = doc.type?.toLowerCase() || "file";
  const thumb = thumbnailUrl || doc.thumbnail_url;
  const isFavorite = !!(doc as any).is_favorite;

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      className={cn(
        "group cursor-pointer rounded-xl border bg-card transition-all duration-200 relative overflow-hidden",
        "hover:shadow-lg hover:shadow-lg hover:-translate-y-0.5",
        isSelected
          ? "ring-2 ring-primary/50 border-primary/30"
          : "border-border/50 hover:border-border",
        isDragging && "opacity-30 scale-95"
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 size-6 flex items-center justify-center
                   rounded-md bg-background/80 backdrop-blur-sm text-muted-foreground
                   opacity-0 group-hover:opacity-100
                   hover:text-foreground hover:bg-black/80 transition-all cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="size-3.5" />
      </div>

      {/* Star toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(doc.id); }}
        className={cn(
          "absolute top-2 right-2 z-10 size-6 flex items-center justify-center rounded-md transition-all",
          isFavorite
            ? "text-warning opacity-100"
            : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-warning"
        )}
      >
        <Star className="size-3.5" fill={isFavorite ? "currentColor" : "none"} />
      </button>

      {/* Preview area */}
      <div className="aspect-[3/4] flex items-center justify-center overflow-hidden bg-muted/30 relative">
        {thumb ? (
          <img src={thumb} alt={doc.filename} className="w-full h-full object-cover object-top" />
        ) : (
          <FileIcon type={ext} size="lg" />
        )}

        {/* Processing indicator */}
        {doc.status === "processing" && (
          <div className="absolute top-2 right-2">
            <span className="relative flex size-2.5">
              <span className="animate-ping absolute h-full w-full rounded-full bg-primary opacity-60" />
              <span className="relative rounded-full size-2.5 bg-primary" />
            </span>
          </div>
        )}

        {/* More menu on hover — bottom-right */}
        <button
          onClick={(e) => { e.stopPropagation(); onContextMenu(e); }}
          className="absolute bottom-2 right-2 size-7 flex items-center justify-center rounded-md
                     bg-background/80 backdrop-blur-sm text-muted-foreground
                     opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-black/80 transition-all"
        >
          <MoreVertical className="size-4" />
        </button>
      </div>

      {/* Meta */}
      <div className="px-3 py-2.5">
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
            className="w-full bg-muted/80 border border-primary/40 rounded-lg px-2.5 py-1.5 text-[13px] text-foreground outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p className="text-[13px] font-medium text-foreground truncate leading-snug" title={doc.filename}>
            {doc.filename}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground mt-0.5">{doc.size}</p>
      </div>
    </div>
  );
}
