/**
 * BulkEditor — Toolbar for batch operations on selected documents
 *
 * Modeled after Paperless-ngx bulk-editor.component.ts.
 * Replaces default toolbar when documents are selected.
 * Actions: set correspondent/type, add/remove tags, delete, download.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  User,
  FileType,
  Tags,
  Trash2,
  Download,
  RotateCw,
  Merge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FilterableDropdown, type DropdownItem } from "./FilterableDropdown";
import type { Correspondent, DocumentType, Tag, StoragePath } from "../../core/types/dms";
import { toast } from "sonner";

// ============================================================================
// Props
// ============================================================================

interface BulkEditorProps {
  /** Number of selected documents */
  selectionCount: number;
  /** Deselect all */
  onDeselectAll: () => void;

  /** Taxonomy data for dropdowns */
  correspondents: Correspondent[];
  documentTypes: DocumentType[];
  tags: Tag[];
  storagePaths: StoragePath[];

  /** Bulk operation handlers */
  onSetCorrespondent: (id: number | null) => void;
  onSetDocumentType: (id: number | null) => void;
  onAddTags: (ids: number[]) => void;
  onRemoveTags: (ids: number[]) => void;
  onSetStoragePath: (id: number | null) => void;
  onDelete: () => void;
  onDownload: () => void;
  onRedoOCR?: () => void;
  onMerge?: () => void;

  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function BulkEditor({
  selectionCount,
  onDeselectAll,
  correspondents,
  documentTypes,
  tags,
  storagePaths,
  onSetCorrespondent,
  onSetDocumentType,
  onAddTags,
  onRemoveTags,
  onSetStoragePath,
  onDelete,
  onDownload,
  onRedoOCR,
  onMerge,
  className,
}: BulkEditorProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tagMode, setTagMode] = useState<"add" | "remove">("add");

  // Convert to DropdownItem[]
  const corrItems: DropdownItem[] = correspondents.map((c) => ({
    id: c.id,
    name: c.name,
    count: c.document_count,
  }));
  const typeItems: DropdownItem[] = documentTypes.map((dt) => ({
    id: dt.id,
    name: dt.name,
    count: dt.document_count,
  }));
  const tagItems: DropdownItem[] = tags.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    count: t.document_count,
  }));
  const pathItems: DropdownItem[] = storagePaths.map((sp) => ({
    id: sp.id,
    name: sp.name,
    count: sp.document_count,
  }));

  return (
    <>
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -10, opacity: 0 }}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-xl",
          "bg-cyan-950/60 backdrop-blur-xl border border-cyan-500/20",
          "shadow-lg shadow-cyan-900/20",
          className
        )}
      >
        {/* Selection count */}
        <div className="flex items-center gap-2 pr-3 border-r border-white/10">
          <span className="flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-cyan-500 text-black text-xs font-bold">
            {selectionCount}
          </span>
          <span className="text-sm font-medium text-cyan-100 whitespace-nowrap">
            selected
          </span>
          <button
            onClick={onDeselectAll}
            className="p-1 rounded-full hover:bg-white/10 text-cyan-200/50 hover:text-cyan-100 transition-colors"
            title="Deselect all (Esc)"
          >
            <X size={14} />
          </button>
        </div>

        {/* Correspondent */}
        <FilterableDropdown
          label="Correspondent"
          icon={<User size={14} />}
          items={corrItems}
          selectedIds={[]}
          onChange={(ids) => {
            const id = ids.length > 0 ? Number(ids[0]) : null;
            onSetCorrespondent(id);
            toast.success(id ? "Correspondent set" : "Correspondent removed");
          }}
          nullable
        />

        {/* Document type */}
        <FilterableDropdown
          label="Type"
          icon={<FileType size={14} />}
          items={typeItems}
          selectedIds={[]}
          onChange={(ids) => {
            const id = ids.length > 0 ? Number(ids[0]) : null;
            onSetDocumentType(id);
            toast.success(id ? "Type set" : "Type removed");
          }}
          nullable
        />

        {/* Tags (add/remove toggle) */}
        <div className="flex items-center gap-1">
          <FilterableDropdown
            label={tagMode === "add" ? "Add tags" : "Remove tags"}
            icon={<Tags size={14} />}
            items={tagItems}
            selectedIds={[]}
            onChange={(ids) => {
              const numIds = ids.map(Number);
              if (tagMode === "add") {
                onAddTags(numIds);
                toast.success(`${numIds.length} tag(s) added`);
              } else {
                onRemoveTags(numIds);
                toast.success(`${numIds.length} tag(s) removed`);
              }
            }}
            multiple
          />
          <button
            onClick={() => setTagMode((m) => (m === "add" ? "remove" : "add"))}
            className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
              tagMode === "add"
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-red-500/20 text-red-300"
            )}
            title="Toggle add/remove mode"
          >
            {tagMode === "add" ? "+" : "−"}
          </button>
        </div>

        {/* Storage path */}
        <FilterableDropdown
          label="Path"
          items={pathItems}
          selectedIds={[]}
          onChange={(ids) => {
            const id = ids.length > 0 ? Number(ids[0]) : null;
            onSetStoragePath(id);
            toast.success(id ? "Path set" : "Path removed");
          }}
          nullable
        />

        <div className="w-px h-6 bg-white/10 mx-1" />

        {/* Redo OCR */}
        {onRedoOCR && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRedoOCR}
            className="text-slate-300 hover:text-white"
            title="Redo OCR"
          >
            <RotateCw size={14} />
          </Button>
        )}

        {/* Merge */}
        {onMerge && selectionCount > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMerge}
            className="text-slate-300 hover:text-white"
            title="Merge documents"
          >
            <Merge size={14} />
          </Button>
        )}

        {/* Download ZIP */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDownload}
          className="text-slate-300 hover:text-white"
          title="Download selected"
        >
          <Download size={14} />
        </Button>

        {/* Delete */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteOpen(true)}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          title="Delete selected"
        >
          <Trash2 size={14} />
        </Button>
      </motion.div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-card border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-200">
              Delete {selectionCount} document{selectionCount !== 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected documents and all their
              associated data (notes, metadata, files) will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete();
                setDeleteOpen(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete {selectionCount} document{selectionCount !== 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
