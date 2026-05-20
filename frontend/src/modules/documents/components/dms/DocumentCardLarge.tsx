/**
 * DocumentCardLarge — Compact DMS document card with thumbnail + metadata
 *
 * Modeled after Paperless-ngx's document-card-large component.
 * Shows compact thumbnail, title, correspondent/type chips, date info,
 * and action buttons (Open, Preview, Download) at bottom.
 */

import { motion } from "framer-motion";
import { FileText, StickyNote, ExternalLink, Eye, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/shared/ui";
import { TagBadge } from "./TagBadge";
import { Checkbox } from "@/components/ui/checkbox";
import type { Tag, Correspondent, DocumentType } from "../../core/types/dms";

interface DocumentCardLargeProps {
  id: number;
  title: string;
  thumbnailUrl?: string | null;
  created?: string;
  correspondent?: Correspondent | null;
  documentType?: DocumentType | null;
  tags?: Tag[];
  asn?: number | null;
  notesCount?: number;
  /** Selection mode */
  selected?: boolean;
  onSelect?: (id: number) => void;
  /** Click to open detail panel */
  onClick?: () => void;
  /** Double-click to navigate to full viewer */
  onDoubleClick?: () => void;
  /** Click on correspondent chip → filter */
  onCorrespondentClick?: (id: number) => void;
  /** Click on type chip → filter */
  onDocumentTypeClick?: (id: number) => void;
  /** Click on tag → filter */
  onTagClick?: (id: number) => void;
  className?: string;
}

export function DocumentCardLarge({
  id,
  title,
  thumbnailUrl,
  created,
  correspondent,
  documentType,
  tags = [],
  asn,
  notesCount = 0,
  selected = false,
  onSelect,
  onClick,
  onDoubleClick,
  onCorrespondentClick,
  onDocumentTypeClick,
  onTagClick,
  className,
}: DocumentCardLargeProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("group", className)}
    >
      <GlassCard
        className={cn(
          "p-0 overflow-hidden relative aspect-[3/4]",
          "border-border hover:border-accent-olive/30 transition-all",
          selected && "ring-2 ring-accent-olive border-accent-olive/50"
        )}
        hover
      >
        <div className="h-full flex flex-col">
          {/* Thumbnail area — fills most of the card like Paperless */}
          <div className="relative overflow-hidden flex-1 min-h-0 bg-gradient-to-br from-white/[0.02] to-white/[0.05]">
            {/* Selection checkbox */}
            {onSelect && (
              <div className="absolute top-2 left-2 z-20">
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => onSelect(id)}
                  className="h-4 w-4 rounded border-white/30 data-[state=checked]:bg-accent-olive data-[state=checked]:border-emerald-500"
                />
              </div>
            )}

            {/* ASN badge */}
            {asn && (
              <div className="absolute top-2 right-2 z-20">
                <span className="px-1.5 py-0.5 text-[9px] font-mono bg-background/80 text-accent-olive/80 rounded-full border border-accent-olive/30">
                  #{asn}
                </span>
              </div>
            )}

            {/* Notes indicator */}
            {notesCount > 0 && (
              <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1 px-1.5 py-0.5 bg-background/80 rounded-full text-[10px] text-amber-300 border border-amber-500/30">
                <StickyNote size={9} />
                {notesCount}
              </div>
            )}

            {thumbnailUrl ? (
              <div
                className="absolute inset-0 cursor-pointer"
                onClick={onClick}
                onDoubleClick={onDoubleClick}
              >
                <img
                  src={thumbnailUrl}
                  alt={title}
                  className="w-full h-full object-cover object-top opacity-80 group-hover:opacity-100 transition-opacity"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              </div>
            ) : (
              <div
                className="h-full flex items-center justify-center cursor-pointer"
                onClick={onClick}
                onDoubleClick={onDoubleClick}
              >
                <div className="p-4 rounded-xl border border-border bg-muted/30">
                  <FileText size={36} strokeWidth={1} className="text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Footer with metadata */}
          <div className="p-2.5 bg-background/70 backdrop-blur-md border-t border-border space-y-1.5">
            {/* Title */}
            <h3
              className="text-xs font-semibold text-foreground/70 truncate cursor-pointer group-hover:text-accent-olive transition-colors"
              onClick={onClick}
              title={title}
            >
              {title}
            </h3>

            {/* Classification chips */}
            <div className="flex items-center gap-1 flex-wrap">
              {correspondent && (
                <button
                  onClick={() => onCorrespondentClick?.(correspondent.id)}
                  className="text-[9px] px-1 py-0.5 rounded-full bg-info/10 text-blue-300 border border-blue-500/20 hover:bg-blue-500/20 transition-colors truncate max-w-[80px]"
                  title={correspondent.name}
                >
                  {correspondent.name}
                </button>
              )}
              {documentType && (
                <button
                  onClick={() => onDocumentTypeClick?.(documentType.id)}
                  className="text-[9px] px-1 py-0.5 rounded-full bg-accent-olive/10 text-accent-olive/80 border border-accent-olive/20 hover:bg-accent-olive/20 transition-colors truncate max-w-[80px]"
                  title={documentType.name}
                >
                  {documentType.name}
                </button>
              )}
            </div>

            {/* Date + page info row */}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              {created && (
                <span>
                  {new Date(created).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {tags.slice(0, 3).map((tag) => (
                  <TagBadge
                    key={tag.id}
                    name={tag.name}
                    color={tag.color}
                    size="sm"
                    onClick={() => onTagClick?.(tag.id)}
                  />
                ))}
                {tags.length > 3 && (
                  <span className="text-[9px] text-muted-foreground self-center">
                    +{tags.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Action buttons — Open, Preview, Download (Paperless-ngx style) */}
            <div className="flex items-center gap-1 pt-1 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={onDoubleClick}
                className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] text-muted-foreground hover:text-accent-olive hover:bg-muted/50 transition-colors"
                title="Open document"
              >
                <ExternalLink size={12} />
              </button>
              <button
                onClick={onClick}
                className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] text-muted-foreground hover:text-accent-olive hover:bg-muted/50 transition-colors"
                title="Preview"
              >
                <Eye size={12} />
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] text-muted-foreground hover:text-accent-olive hover:bg-muted/50 transition-colors"
                title="Download"
              >
                <Download size={12} />
              </button>
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
