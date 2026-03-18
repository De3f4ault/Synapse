/**
 * PreviewPopup — Hover preview tooltip showing document thumbnail + metadata
 *
 * Shows a floating card with thumbnail, title, tags, correspondent, and dates
 * when hovering over a document in a list or grid.
 */

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { TagBadge } from "./TagBadge";
import type { Tag, Correspondent, DocumentType } from "../../core/types/dms";

interface PreviewPopupProps {
  /** Document title */
  title: string;
  /** Thumbnail URL (optional) */
  thumbnailUrl?: string | null;
  /** Tags assigned to the document */
  tags?: Tag[];
  /** Correspondent */
  correspondent?: Correspondent | null;
  /** Document type */
  documentType?: DocumentType | null;
  /** Created date */
  created?: string;
  /** Page count */
  pageCount?: number;
  /** The trigger element */
  children: React.ReactNode;
  /** Disable the popup */
  disabled?: boolean;
}

export function PreviewPopup({
  title,
  thumbnailUrl,
  tags = [],
  correspondent,
  documentType,
  created,
  pageCount,
  children,
  disabled = false,
}: PreviewPopupProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const show = useCallback(() => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => setVisible(true), 400);
  }, [disabled]);

  const hide = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}

      {visible && (
        <div
          className={cn(
            "absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2",
            "w-[280px] rounded-lg border bg-popover p-3 shadow-xl",
            "animate-in fade-in-0 zoom-in-95 duration-150"
          )}
        >
          {/* Thumbnail */}
          {thumbnailUrl && (
            <div className="mb-2 overflow-hidden rounded-md bg-muted">
              <img
                src={thumbnailUrl}
                alt={title}
                className="h-32 w-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Title */}
          <p className="text-sm font-semibold leading-tight truncate">
            {title}
          </p>

          {/* Metadata */}
          <div className="mt-1.5 space-y-1 text-xs text-muted-foreground">
            {correspondent && (
              <div className="flex items-center gap-1">
                <span className="font-medium">From:</span>
                <span className="truncate">{correspondent.name}</span>
              </div>
            )}
            {documentType && (
              <div className="flex items-center gap-1">
                <span className="font-medium">Type:</span>
                <span className="truncate">{documentType.name}</span>
              </div>
            )}
            {created && (
              <div className="flex items-center gap-1">
                <span className="font-medium">Created:</span>
                <span>
                  {new Date(created).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}
            {pageCount !== undefined && pageCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="font-medium">Pages:</span>
                <span>{pageCount}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.slice(0, 5).map((tag) => (
                <TagBadge
                  key={tag.id}
                  name={tag.name}
                  color={tag.color}
                  size="sm"
                />
              ))}
              {tags.length > 5 && (
                <span className="px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  +{tags.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
