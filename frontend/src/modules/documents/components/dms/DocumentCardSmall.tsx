/**
 * DocumentCardSmall — Compact DMS card (thumbnail left, metadata right)
 *
 * Modeled after Paperless-ngx's document-card-small component.
 * Space-efficient default view mode.
 */

import { motion } from "framer-motion";
import { FileText, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { TagBadge } from "./TagBadge";
import type { Tag, Correspondent, DocumentType } from "../../core/types/dms";

interface DocumentCardSmallProps {
  id: number;
  title: string;
  thumbnailUrl?: string | null;
  created?: string;
  correspondent?: Correspondent | null;
  documentType?: DocumentType | null;
  tags?: Tag[];
  asn?: number | null;
  notesCount?: number;
  selected?: boolean;
  onSelect?: (id: number) => void;
  onClick?: () => void;
  onCorrespondentClick?: (id: number) => void;
  onDocumentTypeClick?: (id: number) => void;
  onTagClick?: (id: number) => void;
  className?: string;
}

export function DocumentCardSmall({
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
}: DocumentCardSmallProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn("group", className)}
    >
      <div
        className={cn(
          "flex items-stretch rounded-lg border bg-card/50 backdrop-blur-sm overflow-hidden",
          "hover:border-cyan-500/30 hover:bg-card/80 transition-all cursor-pointer",
          selected && "ring-2 ring-cyan-400 border-cyan-400/50 bg-cyan-500/5"
        )}
      >
        {/* Checkbox */}
        {onSelect && (
          <div className="flex items-center px-2 border-r border-white/5">
            <Checkbox
              checked={selected}
              onCheckedChange={() => onSelect(id)}
              className="h-4 w-4 rounded border-white/30 data-[state=checked]:bg-cyan-500"
            />
          </div>
        )}

        {/* Thumbnail */}
        <div
          className="w-16 h-16 flex-shrink-0 bg-white/[0.03] flex items-center justify-center overflow-hidden"
          onClick={onClick}
        >
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <FileText size={24} strokeWidth={1} className="text-slate-500" />
          )}
        </div>

        {/* Metadata */}
        <div
          className="flex-1 min-w-0 px-3 py-2 space-y-1"
          onClick={onClick}
        >
          {/* Title row */}
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-slate-200 truncate group-hover:text-cyan-400 transition-colors">
              {title}
            </h3>
            {asn && (
              <span className="text-[9px] font-mono px-1 py-0.5 bg-cyan-500/10 text-cyan-300 rounded border border-cyan-500/20 flex-shrink-0">
                #{asn}
              </span>
            )}
            {notesCount > 0 && (
              <span className="flex items-center gap-0.5 text-[9px] text-amber-300 flex-shrink-0">
                <StickyNote size={9} />
                {notesCount}
              </span>
            )}
          </div>

          {/* Classification + date */}
          <div className="flex items-center gap-1.5 text-[10px]">
            {correspondent && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCorrespondentClick?.(correspondent.id);
                }}
                className="px-1 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/15 hover:bg-blue-500/20 truncate max-w-[80px]"
              >
                {correspondent.name}
              </button>
            )}
            {documentType && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDocumentTypeClick?.(documentType.id);
                }}
                className="px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/15 hover:bg-emerald-500/20 truncate max-w-[80px]"
              >
                {documentType.name}
              </button>
            )}
            {created && (
              <span className="text-slate-500 flex-shrink-0">
                {new Date(created).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
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
                <span className="text-[9px] text-slate-500 self-center">
                  +{tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
