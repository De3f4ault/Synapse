/**
 * PDFEditor — Modal for rearranging, rotating, splitting PDF pages
 *
 * Exact port of Paperless-ngx pdf-editor.component.ts (135 lines):
 *   - PageOperation interface: { page, rotate, splitAfter, selected, loaded }
 *   - 2 edit modes: Update (overwrite original) vs Create (new documents)
 *   - Drag-drop page reordering
 *   - Per-page: rotate ±90°, toggle split marker, remove
 *   - Bulk: select all, deselect all, rotate selected, delete selected
 *   - computeDocIndex() for multi-document split numbering (L127-133)
 *   - deleteOriginal + includeMetadata options (L48-49)
 *
 * Note: Actual PDF rendering uses pdf.js (loaded lazily).
 * This component manages the page operations; a future PDFPageThumbnail
 * component will handle canvas rendering.
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  RotateCcw,
  RotateCw,
  Scissors,
  Trash2,
  CheckSquare,
  Square,
  X,
  GripVertical,
  FileText,
  Save,
  Copy,
  Loader2,
} from "lucide-react";

// ============================================================================
// Types (exact match of Paperless PageOperation L14-20)
// ============================================================================

interface PageOperation {
  page: number;
  rotate: number;
  splitAfter: boolean;
  selected: boolean;
  loaded: boolean;
}

/** Matching Paperless PdfEditorEditMode L22-25 */
enum EditMode {
  Update = "update",
  Create = "create",
}

// ============================================================================
// Props
// ============================================================================

interface PDFEditorProps {
  documentId: number;
  totalPages: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (operations: PageOp[], options: SaveOptions) => void;
}

export interface PageOp {
  page: number;
  rotate: number;
  doc: number;
}

interface SaveOptions {
  editMode: "update" | "create";
  deleteOriginal: boolean;
  includeMetadata: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function PDFEditor({
  documentId,
  totalPages,
  isOpen,
  onClose,
  onSave,
}: PDFEditorProps) {
  // Init pages — matching Paperless pdfLoaded() L55-64
  const [pages, setPages] = useState<PageOperation[]>(() =>
    Array.from({ length: totalPages }, (_, i) => ({
      page: i + 1,
      rotate: 0,
      splitAfter: false,
      selected: false,
      loaded: false,
    }))
  );
  const [editMode, setEditMode] = useState<EditMode>(EditMode.Create);
  const [deleteOriginal, setDeleteOriginal] = useState(false);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [saving, setSaving] = useState(false);

  // ---- Page operations (matching Paperless L66-117) ----

  // Paperless toggleSelection L66-68
  const toggleSelection = (i: number) => {
    setPages((prev) => prev.map((p, idx) =>
      idx === i ? { ...p, selected: !p.selected } : p
    ));
  };

  // Paperless rotate L70-73
  const rotatePage = (i: number, counterclockwise = false) => {
    setPages((prev) => prev.map((p, idx) =>
      idx === i
        ? { ...p, rotate: (p.rotate + (counterclockwise ? -90 : 90) + 360) % 360 }
        : p
    ));
  };

  // Paperless rotateSelected L75-81
  const rotateSelected = (dir: number) => {
    setPages((prev) => prev.map((p) =>
      p.selected ? { ...p, rotate: (p.rotate + dir + 360) % 360 } : p
    ));
  };

  // Paperless remove L83-85
  const removePage = (i: number) => {
    setPages((prev) => prev.filter((_, idx) => idx !== i));
  };

  // Paperless toggleSplit L87-93
  const toggleSplit = (i: number) => {
    setPages((prev) => prev.map((p, idx) => {
      if (idx !== i) return p;
      const splitAfter = !p.splitAfter;
      // Force create mode when splitting (Paperless L91)
      if (splitAfter) setEditMode(EditMode.Create);
      return { ...p, splitAfter };
    }));
  };

  // Paperless selectAll L95-97 / deselectAll L99-101
  const selectAll = () => setPages((prev) => prev.map((p) => ({ ...p, selected: true })));
  const deselectAll = () => setPages((prev) => prev.map((p) => ({ ...p, selected: false })));

  // Paperless deleteSelected L103-105
  const deleteSelected = () => setPages((prev) => prev.filter((p) => !p.selected));

  const hasSelection = pages.some((p) => p.selected);
  const hasSplit = pages.some((p) => p.splitAfter);

  // Paperless computeDocIndex L127-133
  const computeDocIndex = (index: number): number => {
    let docIndex = 0;
    for (let i = 0; i <= index; i++) {
      if (pages[i].splitAfter && i < index) docIndex++;
    }
    return docIndex;
  };

  // Paperless getOperations L119-125
  const handleSave = async () => {
    setSaving(true);
    const ops: PageOp[] = pages.map((p, idx) => ({
      page: p.page,
      rotate: p.rotate,
      doc: computeDocIndex(idx),
    }));
    onSave(ops, { editMode, deleteOriginal, includeMetadata });
    setSaving(false);
  };

  // Drag-drop reorder — matching Paperless drop L115-117
  const handleReorder = useCallback((newOrder: PageOperation[]) => {
    setPages(newOrder);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={cn(
          "relative z-10 w-full max-w-4xl mx-4 max-h-[85vh]",
          "bg-card/95 backdrop-blur-xl border border-border rounded-2xl",
          "shadow-2xl shadow-black/40 flex flex-col"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <FileText size={18} className="text-primary" />
            <h2 className="text-base font-semibold text-foreground">PDF Editor</h2>
            <span className="text-xs text-muted-foreground">
              {pages.length} pages
            </span>
          </div>

          {/* Bulk actions */}
          <div className="flex items-center gap-1.5">
            {hasSelection && (
              <>
                <Button variant="ghost" size="sm" onClick={() => rotateSelected(90)} className="text-xs text-foreground/80 h-7">
                  <RotateCw size={13} className="mr-1" /> Rotate
                </Button>
                <Button variant="ghost" size="sm" onClick={deleteSelected} className="text-xs text-destructive h-7">
                  <Trash2 size={13} className="mr-1" /> Delete
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll} className="text-xs text-muted-foreground h-7">
                  Deselect
                </Button>
              </>
            )}
            {!hasSelection && (
              <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs text-muted-foreground h-7">
                Select all
              </Button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted ml-2">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Page grid with drag-drop */}
        <div className="flex-1 overflow-y-auto p-4">
          <Reorder.Group
            axis="x"
            values={pages}
            onReorder={handleReorder}
            className="flex flex-wrap gap-3"
          >
            {pages.map((page, i) => (
              <Reorder.Item key={`page-${page.page}`} value={page}>
                <div
                  className={cn(
                    "relative w-28 rounded-lg border transition-all cursor-grab active:cursor-grabbing",
                    page.selected
                      ? "border-primary bg-primary/[0.08]"
                      : "border-border bg-foreground/5 hover:border-border"
                  )}
                >
                  {/* Page thumbnail placeholder */}
                  <div
                    className="aspect-[3/4] flex items-center justify-center bg-foreground/5 rounded-t-lg"
                    onClick={() => toggleSelection(i)}
                    style={{ transform: `rotate(${page.rotate}deg)` }}
                  >
                    <span className="text-2xl font-bold text-muted-foreground">
                      {page.page}
                    </span>
                  </div>

                  {/* Selection checkbox */}
                  <button
                    className="absolute top-1 left-1 p-0.5"
                    onClick={() => toggleSelection(i)}
                  >
                    {page.selected ? (
                      <CheckSquare size={14} className="text-primary" />
                    ) : (
                      <Square size={14} className="text-muted-foreground" />
                    )}
                  </button>

                  {/* Drag handle */}
                  <GripVertical
                    size={12}
                    className="absolute top-1 right-1 text-muted-foreground"
                  />

                  {/* Page actions */}
                  <div className="flex items-center justify-between px-1.5 py-1 border-t border-border">
                    <button
                      onClick={() => rotatePage(i, true)}
                      className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                      title="Rotate counter-clockwise"
                    >
                      <RotateCcw size={11} />
                    </button>
                    <button
                      onClick={() => rotatePage(i)}
                      className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                      title="Rotate clockwise"
                    >
                      <RotateCw size={11} />
                    </button>
                    <button
                      onClick={() => toggleSplit(i)}
                      className={cn(
                        "p-0.5 transition-colors",
                        page.splitAfter
                          ? "text-warning"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Split after this page"
                    >
                      <Scissors size={11} />
                    </button>
                    <button
                      onClick={() => removePage(i)}
                      className="p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                      title="Remove page"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  {/* Split marker */}
                  {page.splitAfter && (
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-amber-400 rounded-full" />
                  )}

                  {/* Doc index badge (when splitting) */}
                  {hasSplit && (
                    <div className="absolute top-1 right-6 px-1 py-0.5 text-[9px] bg-warning/20 text-warning rounded font-mono">
                      D{computeDocIndex(i) + 1}
                    </div>
                  )}
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>

        {/* Footer — matching Paperless edit mode + options */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <div className="flex items-center gap-4">
            {/* Edit mode */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Mode</label>
              <select
                value={editMode}
                onChange={(e) => setEditMode(e.target.value as EditMode)}
                disabled={hasSplit}
                className="px-2 py-1 rounded text-xs bg-white/[0.04] border border-border text-foreground/70"
              >
                <option value="update" className="bg-slate-800">Update original</option>
                <option value="create" className="bg-slate-800">Create new</option>
              </select>
            </div>

            {/* Options (Paperless L48-49) */}
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                className="rounded border-border bg-foreground/5"
              />
              Include metadata
            </label>

            {editMode === "create" && (
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteOriginal}
                  onChange={(e) => setDeleteOriginal(e.target.checked)}
                  className="rounded border-border bg-foreground/5"
                />
                Delete original
              </label>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || pages.length === 0}
            className="bg-primary hover:bg-primary text-foreground"
            size="sm"
          >
            {saving ? (
              <Loader2 size={14} className="mr-1.5 animate-spin" />
            ) : editMode === "update" ? (
              <Save size={14} className="mr-1.5" />
            ) : (
              <Copy size={14} className="mr-1.5" />
            )}
            {editMode === "update" ? "Save changes" : "Create document(s)"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
