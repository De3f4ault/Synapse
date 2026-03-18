/**
 * TaxonomyTable — Shared sortable table for managing taxonomy items
 *
 * Used by CorrespondentsPage, DocumentTypesPage, TagsPage, StoragePathsPage.
 * Shows name, matching algorithm, match pattern, document count, and actions.
 */

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  ChevronUp,
  ChevronDown,
  FileText,
} from "lucide-react";
import { GlassCard } from "@/shared/ui";
import { MatchingAlgorithm, MATCHING_ALGORITHM_LABELS } from "../../core/types/dms";

// ============================================================================
// Types
// ============================================================================

export interface TaxonomyItem {
  id: number;
  name: string;
  slug?: string;
  match?: string;
  matching_algorithm?: MatchingAlgorithm;
  is_insensitive?: boolean;
  document_count?: number;
  /** Tag-specific */
  color?: string;
  is_inbox_tag?: boolean;
  /** StoragePath-specific */
  path?: string;
}

interface TaxonomyTableProps<T extends TaxonomyItem> {
  items: T[];
  /** Column label for extra field (e.g. "Color" for tags, "Path" for storage paths) */
  extraColumn?: { label: string; render: (item: T) => React.ReactNode };
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  onBulkDelete?: (items: T[]) => void;
  onCreate: () => void;
  title: string;
  isLoading?: boolean;
}

type SortField = "name" | "match" | "matching_algorithm" | "document_count";

// ============================================================================
// Component
// ============================================================================

export function TaxonomyTable<T extends TaxonomyItem>({
  items,
  extraColumn,
  onEdit,
  onDelete,
  onBulkDelete,
  onCreate,
  title,
  isLoading = false,
}: TaxonomyTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortReverse, setSortReverse] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.match || "").toLowerCase().includes(q)
    );
  }, [items, search]);

  // Sort
  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "match":
          cmp = (a.match || "").localeCompare(b.match || "");
          break;
        case "matching_algorithm":
          cmp = (a.matching_algorithm || 0) - (b.matching_algorithm || 0);
          break;
        case "document_count":
          cmp = (a.document_count || 0) - (b.document_count || 0);
          break;
      }
      return sortReverse ? -cmp : cmp;
    });
    return copy;
  }, [filtered, sortField, sortReverse]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortReverse(!sortReverse);
    else {
      setSortField(field);
      setSortReverse(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = sorted.length > 0 && selectedIds.size === sorted.length;
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(sorted.map((i) => i.id)));
  };

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field ? (
      sortReverse ? (
        <ChevronDown size={12} />
      ) : (
        <ChevronUp size={12} />
      )
    ) : null;

  return (
    <GlassCard className="p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter..."
              className="h-8 w-48 pl-7 bg-white/5 border-white/10 text-sm"
            />
          </div>

          {/* Bulk delete */}
          {onBulkDelete && selectedIds.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const selectedItems = sorted.filter((i) =>
                  selectedIds.has(i.id)
                );
                onBulkDelete(selectedItems);
                setSelectedIds(new Set());
              }}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 size={14} className="mr-1" />
              Delete ({selectedIds.size})
            </Button>
          )}

          {/* Create */}
          <Button
            size="sm"
            onClick={onCreate}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            <Plus size={14} className="mr-1" />
            Create
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left">
              <th className="p-3 w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  className="h-4 w-4"
                />
              </th>
              <th
                className="p-3 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors"
                onClick={() => toggleSort("name")}
              >
                <span className="flex items-center gap-1">
                  Name <SortIcon field="name" />
                </span>
              </th>
              <th
                className="p-3 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors"
                onClick={() => toggleSort("matching_algorithm")}
              >
                <span className="flex items-center gap-1">
                  Algorithm <SortIcon field="matching_algorithm" />
                </span>
              </th>
              <th
                className="p-3 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors"
                onClick={() => toggleSort("match")}
              >
                <span className="flex items-center gap-1">
                  Match <SortIcon field="match" />
                </span>
              </th>
              {extraColumn && (
                <th className="p-3 text-slate-400 font-medium">
                  {extraColumn.label}
                </th>
              )}
              <th
                className="p-3 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors text-right"
                onClick={() => toggleSort("document_count")}
              >
                <span className="flex items-center gap-1 justify-end">
                  Docs <SortIcon field="document_count" />
                </span>
              </th>
              <th className="p-3 w-24 text-slate-400 font-medium text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-white/[0.03]">
                  <td colSpan={6 + (extraColumn ? 1 : 0)} className="p-3">
                    <div className="h-5 rounded bg-white/5 animate-pulse" />
                  </td>
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={6 + (extraColumn ? 1 : 0)}
                  className="p-8 text-center text-slate-500"
                >
                  {search
                    ? "No items match your filter"
                    : "No items yet — create one to get started"}
                </td>
              </tr>
            ) : (
              sorted.map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    "border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer",
                    selectedIds.has(item.id) && "bg-cyan-500/5"
                  )}
                  onClick={() => onEdit(item)}
                >
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="p-3 text-slate-200 font-medium">
                    {item.color && (
                      <span
                        className="inline-block w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: item.color }}
                      />
                    )}
                    {item.name}
                    {item.is_inbox_tag && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        inbox
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-slate-500 text-xs">
                    {item.matching_algorithm !== undefined
                      ? MATCHING_ALGORITHM_LABELS[item.matching_algorithm]
                      : "—"}
                  </td>
                  <td className="p-3 text-slate-500 text-xs font-mono truncate max-w-[200px]">
                    {item.match || "—"}
                  </td>
                  {extraColumn && (
                    <td className="p-3">{extraColumn.render(item)}</td>
                  )}
                  <td className="p-3 text-right">
                    <span className="flex items-center gap-1 text-xs text-slate-400 justify-end">
                      <FileText size={12} />
                      {item.document_count ?? 0}
                    </span>
                  </td>
                  <td
                    className="p-3 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(item)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(item)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-400"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
