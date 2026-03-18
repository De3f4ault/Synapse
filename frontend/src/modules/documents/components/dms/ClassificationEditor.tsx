/**
 * ClassificationEditor — Correspondent / Document Type / Tags / Storage Path editing
 *
 * Uses FilterableDropdown from Sprint 1 for inline taxonomy selection.
 * Part of the DocumentDetailPanel.
 */

import { cn } from "@/lib/utils";
import { FilterableDropdown, type DropdownItem } from "./FilterableDropdown";
import { TagBadge } from "./TagBadge";
import type {
  Correspondent,
  DocumentType,
  Tag,
  StoragePath,
} from "../../core/types/dms";

interface ClassificationEditorProps {
  // Current values
  correspondentId?: number | null;
  documentTypeId?: number | null;
  tagIds?: number[];
  storagePathId?: number | null;
  // Available options
  correspondents: Correspondent[];
  documentTypes: DocumentType[];
  tags: Tag[];
  storagePaths: StoragePath[];
  // Change handlers
  onCorrespondentChange: (id: number | null) => void;
  onDocumentTypeChange: (id: number | null) => void;
  onTagsChange: (ids: number[]) => void;
  onStoragePathChange: (id: number | null) => void;
  // Create handlers
  onCreateCorrespondent?: (name: string) => void;
  onCreateDocumentType?: (name: string) => void;
  onCreateTag?: (name: string) => void;
  onCreateStoragePath?: (name: string) => void;
  readOnly?: boolean;
  className?: string;
}

export function ClassificationEditor({
  correspondentId,
  documentTypeId,
  tagIds = [],
  storagePathId,
  correspondents,
  documentTypes,
  tags,
  storagePaths,
  onCorrespondentChange,
  onDocumentTypeChange,
  onTagsChange,
  onStoragePathChange,
  onCreateCorrespondent,
  onCreateDocumentType,
  onCreateTag,
  onCreateStoragePath,
  readOnly = false,
  className,
}: ClassificationEditorProps) {
  // Convert taxonomy to dropdown items
  const correspondentItems: DropdownItem[] = correspondents.map((c) => ({
    id: c.id,
    name: c.name,
    count: c.document_count,
  }));

  const documentTypeItems: DropdownItem[] = documentTypes.map((dt) => ({
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

  const storagePathItems: DropdownItem[] = storagePaths.map((sp) => ({
    id: sp.id,
    name: sp.name,
    count: sp.document_count,
  }));

  // Selected tags display
  const selectedTags = tags.filter((t) => tagIds.includes(t.id));

  return (
    <div className={cn("space-y-4", className)}>
      {/* Correspondent */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground font-medium">
          Correspondent
        </label>
        <FilterableDropdown
          label="Select correspondent"
          items={correspondentItems}
          selectedIds={correspondentId ? [correspondentId] : []}
          onChange={(ids) =>
            onCorrespondentChange(ids.length ? Number(ids[0]) : null)
          }
          nullable
          showCounts
          allowCreate={!!onCreateCorrespondent}
          onCreate={onCreateCorrespondent}
          disabled={readOnly}
          className="w-full"
        />
      </div>

      {/* Document Type */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground font-medium">
          Document type
        </label>
        <FilterableDropdown
          label="Select type"
          items={documentTypeItems}
          selectedIds={documentTypeId ? [documentTypeId] : []}
          onChange={(ids) =>
            onDocumentTypeChange(ids.length ? Number(ids[0]) : null)
          }
          nullable
          showCounts
          allowCreate={!!onCreateDocumentType}
          onCreate={onCreateDocumentType}
          disabled={readOnly}
          className="w-full"
        />
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground font-medium">
          Tags
        </label>
        <FilterableDropdown
          label="Select tags"
          items={tagItems}
          selectedIds={tagIds}
          onChange={(ids) => onTagsChange(ids.map(Number))}
          multiple
          showCounts
          allowCreate={!!onCreateTag}
          onCreate={onCreateTag}
          disabled={readOnly}
          className="w-full"
        />
        {/* Display selected tags as colored badges */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {selectedTags.map((tag) => (
              <TagBadge
                key={tag.id}
                name={tag.name}
                color={tag.color}
                removable={!readOnly}
                onRemove={() =>
                  onTagsChange(tagIds.filter((id) => id !== tag.id))
                }
                size="sm"
              />
            ))}
          </div>
        )}
      </div>

      {/* Storage Path */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground font-medium">
          Storage path
        </label>
        <FilterableDropdown
          label="Select path"
          items={storagePathItems}
          selectedIds={storagePathId ? [storagePathId] : []}
          onChange={(ids) =>
            onStoragePathChange(ids.length ? Number(ids[0]) : null)
          }
          nullable
          showCounts
          allowCreate={!!onCreateStoragePath}
          onCreate={onCreateStoragePath}
          disabled={readOnly}
          className="w-full"
        />
      </div>
    </div>
  );
}
