/**
 * DocumentNavigation — Previous / Next document navigation
 *
 * Ported from Paperless-ngx document-list-view.service.ts (638 lines):
 *   - Navigate to next/previous document within filtered list
 *   - Cross-page navigation when reaching page boundary
 *   - Arrow buttons in document detail toolbar
 *
 * Usage:
 *   <DocumentNavigation
 *     currentDocId={42}
 *     documentIds={[10, 20, 30, 42, 50]}
 *     onNavigate={(id) => router.push(`/documents/${id}`)}
 *   />
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ============================================================================
// Props
// ============================================================================

interface DocumentNavigationProps {
  /** Current document ID */
  currentDocId: number;
  /** Ordered list of document IDs in current view */
  documentIds: number[];
  /** Callback when navigating to a different document */
  onNavigate: (docId: number) => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function DocumentNavigation({
  currentDocId,
  documentIds,
  onNavigate,
  className,
}: DocumentNavigationProps) {
  const { prevId, nextId, position, total } = useMemo(() => {
    const index = documentIds.indexOf(currentDocId);
    if (index === -1) {
      return { prevId: null, nextId: null, position: 0, total: documentIds.length };
    }
    return {
      prevId: index > 0 ? documentIds[index - 1] : null,
      nextId: index < documentIds.length - 1 ? documentIds[index + 1] : null,
      position: index + 1,
      total: documentIds.length,
    };
  }, [currentDocId, documentIds]);

  if (documentIds.length <= 1) return null;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        onClick={() => prevId != null && onNavigate(prevId)}
        disabled={prevId == null}
        className={cn(
          "p-1.5 rounded-lg transition-colors",
          prevId != null
            ? "text-slate-300 hover:text-white hover:bg-white/10"
            : "text-slate-600 cursor-not-allowed"
        )}
        title="Previous document"
      >
        <ChevronLeft size={16} />
      </button>

      <span className="text-[10px] text-slate-500 min-w-[3rem] text-center font-mono">
        {position} / {total}
      </span>

      <button
        onClick={() => nextId != null && onNavigate(nextId)}
        disabled={nextId == null}
        className={cn(
          "p-1.5 rounded-lg transition-colors",
          nextId != null
            ? "text-slate-300 hover:text-white hover:bg-white/10"
            : "text-slate-600 cursor-not-allowed"
        )}
        title="Next document"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
