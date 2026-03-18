/**
 * DocumentCardLarge — Full-width DMS document card with thumbnail + metadata
 *
 * Modeled after Paperless-ngx's document-card-large component.
 * Shows thumbnail, title, correspondent/type chips, colored tags, dates, ASN.
 */

import { motion } from "framer-motion";
import { FileText, MoreVertical, StickyNote, ExternalLink } from "lucide-react";
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
  /** Click to navigate */
  onClick?: () => void;
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
          "h-[320px] p-0 overflow-hidden relative",
          "border-white/5 hover:border-cyan-500/30 transition-all",
          selected && "ring-2 ring-cyan-400 border-cyan-400/50"
        )}
        hover
      >
        <div className="h-full flex flex-col">
          {/* Thumbnail area */}
          <div className="flex-1 relative overflow-hidden min-h-0 bg-gradient-to-br from-white/[0.02] to-white/[0.05]">
            {/* Selection checkbox */}
            {onSelect && (
              <div className="absolute top-3 left-3 z-20">
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => onSelect(id)}
                  className="h-5 w-5 rounded border-white/30 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                />
              </div>
            )}

            {/* ASN badge */}
            {asn && (
              <div className="absolute top-3 right-3 z-20">
                <span className="px-2 py-0.5 text-[10px] font-mono bg-black/60 text-cyan-300 rounded-full border border-cyan-500/30">
                  #{asn}
                </span>
              </div>
            )}

            {/* Notes indicator */}
            {notesCount > 0 && (
              <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 px-1.5 py-0.5 bg-black/60 rounded-full text-xs text-amber-300 border border-amber-500/30">
                <StickyNote size={10} />
                {notesCount}
              </div>
            )}

            {thumbnailUrl ? (
              <div className="absolute inset-0 cursor-pointer" onClick={onClick}>
                <img
                  src={thumbnailUrl}
                  alt={title}
                  className="w-full h-full object-cover object-top opacity-80 group-hover:opacity-100 transition-opacity"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              </div>
            ) : (
              <div
                className="h-full flex items-center justify-center cursor-pointer"
                onClick={onClick}
              >
                <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm">
                  <FileText size={56} strokeWidth={1} className="text-slate-400" />
                </div>
              </div>
            )}
          </div>

          {/* Footer with metadata */}
          <div className="shrink-0 p-3 bg-black/40 backdrop-blur-md border-t border-white/10 space-y-2">
            {/* Title + actions */}
            <div className="flex justify-between items-start gap-2">
              <h3
                className="text-sm font-semibold text-slate-200 truncate cursor-pointer group-hover:text-cyan-400 transition-colors flex-1"
                onClick={onClick}
                title={title}
              >
                {title}
              </h3>
              <button className="text-slate-500 hover:text-white p-0.5 rounded hover:bg-white/5 flex-shrink-0">
                <MoreVertical size={14} />
              </button>
            </div>

            {/* Classification chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {correspondent && (
                <button
                  onClick={() => onCorrespondentClick?.(correspondent.id)}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:bg-blue-500/20 transition-colors truncate max-w-[100px]"
                  title={correspondent.name}
                >
                  {correspondent.name}
                </button>
              )}
              {documentType && (
                <button
                  onClick={() => onDocumentTypeClick?.(documentType.id)}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors truncate max-w-[100px]"
                  title={documentType.name}
                >
                  {documentType.name}
                </button>
              )}
              {created && (
                <span className="text-[10px] text-slate-500">
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
                {tags.slice(0, 4).map((tag) => (
                  <TagBadge
                    key={tag.id}
                    name={tag.name}
                    color={tag.color}
                    size="sm"
                    onClick={() => onTagClick?.(tag.id)}
                  />
                ))}
                {tags.length > 4 && (
                  <span className="text-[10px] text-slate-500 self-center">
                    +{tags.length - 4}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
