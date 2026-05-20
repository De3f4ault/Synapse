/**
 * DocumentTabs — Horizontal tab bar for open documents
 *
 * Ported from Paperless-ngx open-documents UI patterns:
 *   - Shows up to 5 open documents as tabs
 *   - Active tab highlighted with cyan accent
 *   - Dirty indicator (dot) on unsaved documents
 *   - Close button per tab with dirty confirmation
 *   - "Close all" button when >1 tabs open
 */

import { cn } from "@/lib/utils";
import { X, Circle } from "lucide-react";
import { useOpenDocuments } from "../../hooks/useOpenDocuments";
import type { OpenDoc } from "../../hooks/useOpenDocuments";

// ============================================================================
// Props
// ============================================================================

interface DocumentTabsProps {
  activeDocId: number | null;
  onTabClick: (doc: OpenDoc) => void;
  onCloseConfirm: (doc: OpenDoc) => void;
  onCloseAllConfirm: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function DocumentTabs({
  activeDocId,
  onTabClick,
  onCloseConfirm,
  onCloseAllConfirm,
  className,
}: DocumentTabsProps) {
  const { openDocs, dirtyDocs, closeDocument, forceClose, closeAll, forceCloseAll } =
    useOpenDocuments();

  if (openDocs.length === 0) return null;

  const handleClose = (e: React.MouseEvent, doc: OpenDoc) => {
    e.stopPropagation();
    const result = closeDocument(doc.id);
    if (result.needsConfirmation) {
      onCloseConfirm(doc);
    }
  };

  const handleCloseAll = () => {
    const result = closeAll();
    if (result.needsConfirmation) {
      onCloseAllConfirm();
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 px-2 py-1 overflow-x-auto",
        "border-b border-border bg-background/50",
        "scrollbar-none",
        className
      )}
    >
      {openDocs.map((doc) => {
        const isActive = doc.id === activeDocId;
        const isDirty = dirtyDocs.has(doc.id);

        return (
          <button
            key={doc.id}
            onClick={() => onTabClick(doc)}
            className={cn(
              "group relative flex items-center gap-1.5 px-3 py-1.5 rounded-md",
              "text-xs font-medium transition-all duration-150 max-w-[180px]",
              "hover:bg-white/[0.04]",
              isActive
                ? "bg-white/[0.06] text-foreground"
                : "text-muted-foreground hover:text-foreground/70"
            )}
          >
            {/* Active indicator */}
            {isActive && (
              <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-full" />
            )}

            {/* Dirty dot (matching Paperless dirty indicator) */}
            {isDirty && (
              <Circle
                size={6}
                className="fill-amber-400 text-warning shrink-0"
              />
            )}

            {/* Title */}
            <span className="truncate">
              {doc.title || doc.filename}
            </span>

            {/* Close button */}
            <span
              onClick={(e) => handleClose(e, doc)}
              className={cn(
                "shrink-0 p-0.5 rounded transition-colors",
                "opacity-0 group-hover:opacity-100",
                "hover:bg-muted hover:text-foreground"
              )}
            >
              <X size={12} />
            </span>
          </button>
        );
      })}

      {/* Close all (Paperless closeAll pattern) */}
      {openDocs.length > 1 && (
        <button
          onClick={handleCloseAll}
          className={cn(
            "ml-1 px-2 py-1 rounded text-[10px] text-muted-foreground",
            "hover:text-foreground/80 hover:bg-muted/30 transition-colors",
            "whitespace-nowrap"
          )}
        >
          Close all
        </button>
      )}
    </div>
  );
}
