/**
 * TrashPage — Trash/recycle bin document listing
 *
 * Ported from Paperless-ngx trash UI patterns:
 *   - Paginated list of soft-deleted documents
 *   - Multi-select with restore / permanent-delete
 *   - "Empty trash" button with confirmation
 *   - Shows deleted_at timestamp and days until auto-purge
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/shared/ui";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  CheckSquare,
  Square,
  Clock,
} from "lucide-react";
import { useTrashList, useRestoreDocuments, useEmptyTrash } from "../../hooks/useTrash";
import type { TrashedDocument } from "../../hooks/useTrash";

// ============================================================================
// Helpers
// ============================================================================

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function daysUntilPurge(dateStr: string, autoEmptyDays = 30): number {
  const deletedAt = new Date(dateStr).getTime();
  const purgeAt = deletedAt + autoEmptyDays * 86_400_000;
  return Math.max(0, Math.ceil((purgeAt - Date.now()) / 86_400_000));
}

const fileTypeIcons: Record<string, string> = {
  pdf: "📄",
  doc: "📝",
  docx: "📝",
  png: "🖼️",
  jpg: "🖼️",
  jpeg: "🖼️",
  txt: "📃",
};

// ============================================================================
// Component
// ============================================================================

export function TrashPage() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const { data: trashedDocs = [], isLoading } = useTrashList(page);
  const restoreMutation = useRestoreDocuments();
  const emptyMutation = useEmptyTrash();

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === trashedDocs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(trashedDocs.map((d) => d.id)));
    }
  };

  const handleRestore = async () => {
    if (selected.size === 0) return;
    await restoreMutation.mutateAsync(Array.from(selected));
    setSelected(new Set());
  };

  const handlePermanentDelete = async () => {
    if (selected.size === 0) return;
    await emptyMutation.mutateAsync(Array.from(selected));
    setSelected(new Set());
  };

  const handleEmptyAll = async () => {
    await emptyMutation.mutateAsync(undefined);
    setConfirmEmpty(false);
    setSelected(new Set());
  };

  return (
    <div className="flex flex-col gap-4 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trash2 size={22} className="text-destructive" />
          <h1 className="text-xl font-bold text-foreground">Trash</h1>
          {trashedDocs.length > 0 && (
            <span className="text-xs text-muted-foreground bg-foreground/5 px-2 py-0.5 rounded-full">
              {trashedDocs.length} items
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestore}
                disabled={restoreMutation.isPending}
                className="text-accent-olive hover:text-accent-olive/80 hover:bg-accent-olive/10"
              >
                <RotateCcw size={14} className="mr-1.5" />
                Restore ({selected.size})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePermanentDelete}
                disabled={emptyMutation.isPending}
                className="text-destructive hover:text-red-300 hover:bg-destructive/10"
              >
                <Trash2 size={14} className="mr-1.5" />
                Delete permanently
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmEmpty(true)}
            disabled={trashedDocs.length === 0}
            className="text-destructive hover:text-red-300 hover:bg-destructive/10"
          >
            <AlertTriangle size={14} className="mr-1.5" />
            Empty trash
          </Button>
        </div>
      </div>

      {/* Confirm empty dialog */}
      <AnimatePresence>
        {confirmEmpty && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <GlassCard className="p-4 border-destructive/20 bg-destructive/[0.03]">
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} className="text-destructive shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-300">
                    Permanently delete all {trashedDocs.length} items?
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This action cannot be undone.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmEmpty(false)}
                    className="text-muted-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEmptyAll}
                    disabled={emptyMutation.isPending}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    {emptyMutation.isPending ? "Deleting..." : "Empty trash"}
                  </Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document list */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : trashedDocs.length === 0 ? (
        <GlassCard className="py-16 text-center">
          <Trash2 size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Trash is empty</p>
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden divide-y divide-white/[0.03]">
          {/* Select all header */}
          <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.01]">
            <button onClick={selectAll} className="text-muted-foreground hover:text-foreground transition-colors">
              {selected.size === trashedDocs.length ? (
                <CheckSquare size={16} className="text-primary" />
              ) : (
                <Square size={16} />
              )}
            </button>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              {selected.size > 0 ? `${selected.size} selected` : "Select all"}
            </span>
          </div>

          {/* Document rows */}
          {trashedDocs.map((doc: TrashedDocument) => {
            const isSelected = selected.has(doc.id);
            const daysLeft = daysUntilPurge(doc.deleted_at);

            return (
              <div
                key={doc.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer",
                  isSelected
                    ? "bg-primary/[0.05]"
                    : "hover:bg-muted/50"
                )}
                onClick={() => toggleSelect(doc.id)}
              >
                <button className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                  {isSelected ? (
                    <CheckSquare size={16} className="text-primary" />
                  ) : (
                    <Square size={16} />
                  )}
                </button>

                <span className="text-lg shrink-0">
                  {fileTypeIcons[doc.file_type] || "📄"}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{doc.filename}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                    <span>{(doc.file_size / 1024).toFixed(0)} KB</span>
                    <span>·</span>
                    <span>Deleted {timeAgo(doc.deleted_at)}</span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Clock size={11} className={cn(
                    daysLeft <= 5 ? "text-destructive" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-[10px]",
                    daysLeft <= 5 ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {daysLeft}d left
                  </span>
                </div>
              </div>
            );
          })}
        </GlassCard>
      )}

      {/* Pagination */}
      {trashedDocs.length > 0 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="text-xs text-muted-foreground"
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground flex items-center px-3">
            Page {page}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            className="text-xs text-muted-foreground"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
