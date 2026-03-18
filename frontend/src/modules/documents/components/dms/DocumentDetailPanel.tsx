/**
 * DocumentDetailPanel — Full-featured document detail side panel
 *
 * Modeled after Paperless-ngx's document-detail component.
 * Split view: metadata editing on the right panel.
 * Combines MetadataEditor, ClassificationEditor, NotesSection, SuggestionsPanel.
 */

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MetadataEditor } from "./MetadataEditor";
import { ClassificationEditor } from "./ClassificationEditor";
import { NotesSection } from "./NotesSection";
import { SuggestionsPanel } from "./SuggestionsPanel";
import {
  Save,
  Undo2,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type {
  Correspondent,
  DocumentType,
  Tag,
  StoragePath,
  DocumentNote,
} from "../../core/types/dms";

// ============================================================================
// Types
// ============================================================================

interface DocumentDetail {
  id: number;
  title: string;
  created?: string;
  added?: string;
  modified?: string;
  asn?: number | null;
  correspondentId?: number | null;
  documentTypeId?: number | null;
  tagIds?: number[];
  storagePathId?: number | null;
  originalFilename?: string;
  mimeType?: string;
  fileSize?: string;
  pageCount?: number;
  notes: DocumentNote[];
}

interface DocumentDetailPanelProps {
  document: DocumentDetail;
  // Taxonomy data
  correspondents: Correspondent[];
  documentTypes: DocumentType[];
  tags: Tag[];
  storagePaths: StoragePath[];
  // Save handler
  onSave: (changes: Record<string, unknown>) => void;
  isSaving?: boolean;
  // Notes
  onAddNote: (text: string) => void;
  onDeleteNote: (noteId: number) => void;
  // Navigation
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  // Download
  onDownload?: () => void;
  // AI suggestions
  suggestions?: {
    correspondents?: Array<{ item: Correspondent; confidence: number }>;
    documentTypes?: Array<{ item: DocumentType; confidence: number }>;
    tags?: Array<{ item: Tag; confidence: number }>;
  };
  suggestionsLoading?: boolean;
  // Create handlers
  onCreateCorrespondent?: (name: string) => void;
  onCreateDocumentType?: (name: string) => void;
  onCreateTag?: (name: string) => void;
  onCreateStoragePath?: (name: string) => void;
  currentUserId?: number;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function DocumentDetailPanel({
  document,
  correspondents,
  documentTypes,
  tags,
  storagePaths,
  onSave,
  isSaving = false,
  onAddNote,
  onDeleteNote,
  onClose,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  onDownload,
  suggestions,
  suggestionsLoading = false,
  onCreateCorrespondent,
  onCreateDocumentType,
  onCreateTag,
  onCreateStoragePath,
  currentUserId,
  className,
}: DocumentDetailPanelProps) {
  // Track unsaved changes
  const [changes, setChanges] = useState<Record<string, unknown>>({});
  const isDirty = Object.keys(changes).length > 0;

  // Reset changes when document changes
  useEffect(() => {
    setChanges({});
  }, [document.id]);

  const handleFieldChange = useCallback((field: string, value: unknown) => {
    setChanges((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(() => {
    onSave(changes);
    setChanges({});
  }, [changes, onSave]);

  const handleDiscard = useCallback(() => {
    setChanges({});
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "s" && (e.ctrlKey || e.metaKey) && isDirty) {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape") {
        if (isDirty) {
          handleDiscard();
        } else {
          onClose();
        }
      }
      if (e.key === "ArrowLeft" && e.altKey && hasPrevious) {
        onPrevious?.();
      }
      if (e.key === "ArrowRight" && e.altKey && hasNext) {
        onNext?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isDirty, handleSave, handleDiscard, onClose, hasPrevious, hasNext, onPrevious, onNext]);

  // Current values (merged local changes + original)
  const currentTitle = (changes.title as string) ?? document.title;
  const currentCorrespondentId =
    (changes.correspondent_id as number | null) ?? document.correspondentId ?? null;
  const currentDocTypeId =
    (changes.document_type_id as number | null) ?? document.documentTypeId ?? null;
  const currentTagIds =
    (changes.tag_ids as number[]) ?? document.tagIds ?? [];
  const currentPathId =
    (changes.storage_path_id as number | null) ?? document.storagePathId ?? null;

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-card/80 backdrop-blur-xl border-l border-white/5",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          {/* Navigation */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrevious}
              disabled={!hasPrevious}
              className="h-7 w-7 p-0"
              title="Previous document (Alt+←)"
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNext}
              disabled={!hasNext}
              className="h-7 w-7 p-0"
              title="Next document (Alt+→)"
            >
              <ChevronRight size={14} />
            </Button>
          </div>

          <h2 className="text-sm font-semibold text-slate-200 truncate max-w-[200px]" title={currentTitle}>
            {currentTitle}
          </h2>

          {isDirty && (
            <span className="text-amber-400 text-sm" title="Unsaved changes">
              *
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {onDownload && (
            <Button variant="ghost" size="sm" onClick={onDownload} className="h-7 w-7 p-0" title="Download">
              <Download size={14} />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0" title="Close (Esc)">
            <X size={14} />
          </Button>
        </div>
      </div>

      {/* Save/discard bar */}
      {isDirty && (
        <div className="flex items-center justify-end gap-2 px-4 py-2 bg-amber-500/5 border-b border-amber-500/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDiscard}
            className="h-7 text-xs"
          >
            <Undo2 size={12} className="mr-1" />
            Discard
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-7 text-xs bg-cyan-600 hover:bg-cyan-700"
          >
            <Save size={12} className="mr-1" />
            {isSaving ? "Saving…" : "Save (⌘S)"}
          </Button>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Metadata */}
        <MetadataEditor
          title={currentTitle}
          created={document.created}
          added={document.added}
          modified={document.modified}
          asn={document.asn}
          originalFilename={document.originalFilename}
          mimeType={document.mimeType}
          fileSize={document.fileSize}
          pageCount={document.pageCount}
          onChange={handleFieldChange}
        />

        <Separator className="bg-white/10" />

        {/* Classification */}
        <ClassificationEditor
          correspondentId={currentCorrespondentId}
          documentTypeId={currentDocTypeId}
          tagIds={currentTagIds}
          storagePathId={currentPathId}
          correspondents={correspondents}
          documentTypes={documentTypes}
          tags={tags}
          storagePaths={storagePaths}
          onCorrespondentChange={(id) => handleFieldChange("correspondent_id", id)}
          onDocumentTypeChange={(id) => handleFieldChange("document_type_id", id)}
          onTagsChange={(ids) => handleFieldChange("tag_ids", ids)}
          onStoragePathChange={(id) => handleFieldChange("storage_path_id", id)}
          onCreateCorrespondent={onCreateCorrespondent}
          onCreateDocumentType={onCreateDocumentType}
          onCreateTag={onCreateTag}
          onCreateStoragePath={onCreateStoragePath}
        />

        <Separator className="bg-white/10" />

        {/* AI Suggestions */}
        <SuggestionsPanel
          correspondents={suggestions?.correspondents}
          documentTypes={suggestions?.documentTypes}
          tags={suggestions?.tags}
          isLoading={suggestionsLoading}
          onAcceptCorrespondent={(id) => handleFieldChange("correspondent_id", id)}
          onAcceptDocumentType={(id) => handleFieldChange("document_type_id", id)}
          onAcceptTag={(id) =>
            handleFieldChange("tag_ids", [...currentTagIds, id])
          }
        />

        <Separator className="bg-white/10" />

        {/* Notes */}
        <NotesSection
          notes={document.notes}
          onAddNote={onAddNote}
          onDeleteNote={onDeleteNote}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}
