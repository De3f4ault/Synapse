/**
 * DocumentTable — Sortable DMS table view with configurable columns
 *
 * Modeled after Paperless-ngx's table display mode.
 * Sortable column headers, checkbox selection, configurable display fields.
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { TagBadge } from "./TagBadge";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  CaretSortIcon,
} from "@radix-ui/react-icons";
import { StickyNote } from "lucide-react";
import { DisplayField } from "../../core/types/dms";
import type { Tag, Correspondent, DocumentType } from "../../core/types/dms";

// ============================================================================
// Types
// ============================================================================

export interface TableDocument {
  id: number;
  title: string;
  created?: string;
  added?: string;
  modified?: string;
  correspondent?: Correspondent | null;
  documentType?: DocumentType | null;
  tags?: Tag[];
  asn?: number | null;
  notesCount?: number;
  owner?: string;
}

interface DocumentTableProps {
  documents: TableDocument[];
  displayFields: DisplayField[];
  sortField: string;
  sortReverse: boolean;
  onSort: (field: string) => void;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  isAllSelected: boolean;
  onDocumentClick: (id: number) => void;
  onCorrespondentClick?: (id: number) => void;
  onDocumentTypeClick?: (id: number) => void;
  onTagClick?: (id: number) => void;
  className?: string;
}

// ============================================================================
// Column Definitions
// ============================================================================

interface ColumnDef {
  field: DisplayField;
  label: string;
  sortKey: string;
  width?: string;
  render: (doc: TableDocument) => React.ReactNode;
}

function buildColumns(
  onCorrespondentClick?: (id: number) => void,
  onDocumentTypeClick?: (id: number) => void,
  onTagClick?: (id: number) => void
): Record<DisplayField, ColumnDef> {
  return {
    [DisplayField.TITLE]: {
      field: DisplayField.TITLE,
      label: "Title",
      sortKey: "title",
      render: (doc) => (
        <span className="font-medium text-slate-200 truncate block max-w-[300px]">
          {doc.title}
        </span>
      ),
    },
    [DisplayField.ASN]: {
      field: DisplayField.ASN,
      label: "ASN",
      sortKey: "archive_serial_number",
      width: "w-16",
      render: (doc) =>
        doc.asn ? (
          <span className="font-mono text-xs text-cyan-300">#{doc.asn}</span>
        ) : (
          <span className="text-slate-600">—</span>
        ),
    },
    [DisplayField.CORRESPONDENT]: {
      field: DisplayField.CORRESPONDENT,
      label: "Correspondent",
      sortKey: "correspondent__name",
      render: (doc) =>
        doc.correspondent ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCorrespondentClick?.(doc.correspondent!.id);
            }}
            className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/15 hover:bg-blue-500/20 truncate max-w-[120px]"
          >
            {doc.correspondent.name}
          </button>
        ) : (
          <span className="text-slate-600 text-xs">—</span>
        ),
    },
    [DisplayField.DOCUMENT_TYPE]: {
      field: DisplayField.DOCUMENT_TYPE,
      label: "Type",
      sortKey: "document_type__name",
      render: (doc) =>
        doc.documentType ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDocumentTypeClick?.(doc.documentType!.id);
            }}
            className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/15 hover:bg-emerald-500/20 truncate max-w-[120px]"
          >
            {doc.documentType.name}
          </button>
        ) : (
          <span className="text-slate-600 text-xs">—</span>
        ),
    },
    [DisplayField.TAGS]: {
      field: DisplayField.TAGS,
      label: "Tags",
      sortKey: "tag",
      render: (doc) => (
        <div className="flex gap-0.5 flex-wrap">
          {(doc.tags || []).slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              title={tag.name}
              onClick={(e) => {
                e.stopPropagation();
                onTagClick?.(tag.id);
              }}
              className="w-3 h-3 rounded-full cursor-pointer hover:ring-2 hover:ring-white/30 transition-all"
              style={{ backgroundColor: tag.color }}
            />
          ))}
          {(doc.tags || []).length > 3 && (
            <span className="text-[9px] text-slate-500">
              +{doc.tags!.length - 3}
            </span>
          )}
        </div>
      ),
    },
    [DisplayField.CREATED]: {
      field: DisplayField.CREATED,
      label: "Created",
      sortKey: "created",
      width: "w-28",
      render: (doc) => (
        <span className="text-xs text-slate-400">
          {doc.created
            ? new Date(doc.created).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "—"}
        </span>
      ),
    },
    [DisplayField.ADDED]: {
      field: DisplayField.ADDED,
      label: "Added",
      sortKey: "added",
      width: "w-28",
      render: (doc) => (
        <span className="text-xs text-slate-400">
          {doc.added ? new Date(doc.added).toLocaleDateString() : "—"}
        </span>
      ),
    },
    [DisplayField.NOTES]: {
      field: DisplayField.NOTES,
      label: "Notes",
      sortKey: "num_notes",
      width: "w-14",
      render: (doc) =>
        (doc.notesCount || 0) > 0 ? (
          <span className="flex items-center gap-0.5 text-xs text-amber-300">
            <StickyNote size={10} />
            {doc.notesCount}
          </span>
        ) : null,
    },
    [DisplayField.OWNER]: {
      field: DisplayField.OWNER,
      label: "Owner",
      sortKey: "owner",
      width: "w-24",
      render: (doc) => (
        <span className="text-xs text-slate-400 truncate">{doc.owner || "—"}</span>
      ),
    },
    [DisplayField.STORAGE_PATH]: {
      field: DisplayField.STORAGE_PATH,
      label: "Path",
      sortKey: "storage_path__name",
      render: () => <span className="text-slate-600 text-xs">—</span>,
    },
    [DisplayField.CUSTOM_FIELD]: {
      field: DisplayField.CUSTOM_FIELD,
      label: "Custom",
      sortKey: "custom",
      render: () => null,
    },
    [DisplayField.SHARED]: {
      field: DisplayField.SHARED,
      label: "Shared",
      sortKey: "shared",
      width: "w-14",
      render: () => null,
    },
    [DisplayField.PAGE_COUNT]: {
      field: DisplayField.PAGE_COUNT,
      label: "Pages",
      sortKey: "page_count",
      width: "w-14",
      render: () => null,
    },
  };
}

// ============================================================================
// Sort Header
// ============================================================================

function SortHeader({
  label,
  sortKey,
  currentSort,
  sortReverse,
  onSort,
}: {
  label: string;
  sortKey: string;
  currentSort: string;
  sortReverse: boolean;
  onSort: (field: string) => void;
}) {
  const isActive = currentSort === sortKey;

  return (
    <button
      onClick={() => onSort(sortKey)}
      className={cn(
        "flex items-center gap-1 text-xs font-medium uppercase tracking-wider",
        "hover:text-slate-200 transition-colors",
        isActive ? "text-cyan-400" : "text-slate-500"
      )}
    >
      {label}
      {isActive ? (
        sortReverse ? (
          <ChevronDownIcon className="h-3.5 w-3.5" />
        ) : (
          <ChevronUpIcon className="h-3.5 w-3.5" />
        )
      ) : (
        <CaretSortIcon className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  );
}

// ============================================================================
// Component
// ============================================================================

export function DocumentTable({
  documents,
  displayFields,
  sortField,
  sortReverse,
  onSort,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onSelectNone,
  isAllSelected,
  onDocumentClick,
  onCorrespondentClick,
  onDocumentTypeClick,
  onTagClick,
  className,
}: DocumentTableProps) {
  const columnDefs = useMemo(
    () => buildColumns(onCorrespondentClick, onDocumentTypeClick, onTagClick),
    [onCorrespondentClick, onDocumentTypeClick, onTagClick]
  );

  const visibleColumns = useMemo(
    () =>
      displayFields
        .map((field) => columnDefs[field])
        .filter(Boolean),
    [displayFields, columnDefs]
  );

  return (
    <div className={cn("overflow-x-auto rounded-lg border border-white/5", className)}>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-white/10 bg-black/20">
            {/* Select all checkbox */}
            <th className="w-10 px-3 py-2">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={() =>
                  isAllSelected ? onSelectNone() : onSelectAll()
                }
                className="h-4 w-4 rounded border-white/30 data-[state=checked]:bg-cyan-500"
              />
            </th>
            {visibleColumns.map((col) => (
              <th key={col.field} className={cn("px-3 py-2", col.width)}>
                <SortHeader
                  label={col.label}
                  sortKey={col.sortKey}
                  currentSort={sortField}
                  sortReverse={sortReverse}
                  onSort={onSort}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => {
            const isSelected = selectedIds.has(doc.id);
            return (
              <tr
                key={doc.id}
                onClick={() => onDocumentClick(doc.id)}
                className={cn(
                  "border-b border-white/5 cursor-pointer transition-colors",
                  "hover:bg-white/[0.03]",
                  isSelected && "bg-cyan-500/5"
                )}
              >
                <td className="px-3 py-2">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(doc.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded border-white/30 data-[state=checked]:bg-cyan-500"
                  />
                </td>
                {visibleColumns.map((col) => (
                  <td key={col.field} className={cn("px-3 py-2", col.width)}>
                    {col.render(doc)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
