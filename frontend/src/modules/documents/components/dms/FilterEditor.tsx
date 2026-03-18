/**
 * FilterEditor — Active filters toolbar with chips and add-filter dropdown
 *
 * Modeled after Paperless-ngx filter-editor.component.ts.
 * Shows active filters as ClearableBadge chips and provides
 * FilterableDropdown pickers for correspondents, types, tags.
 */

import { useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ClearableBadge } from "./ClearableBadge";
import { FilterableDropdown, type DropdownItem } from "./FilterableDropdown";
import {
  FilterRule,
  FilterRuleType,
  FILTER_RULE_TYPES,
  type Correspondent,
  type DocumentType,
  type Tag,
  type StoragePath,
} from "../../core/types/dms";
import {
  Cross2Icon,
  MixerHorizontalIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

// ============================================================================
// Props
// ============================================================================

interface FilterEditorProps {
  /** Current filter rules */
  filterRules: FilterRule[];
  /** Update filter rules */
  onFilterRulesChange: (rules: FilterRule[]) => void;
  /** Available correspondents */
  correspondents: Correspondent[];
  /** Available document types */
  documentTypes: DocumentType[];
  /** Available tags */
  tags: Tag[];
  /** Available storage paths */
  storagePaths: StoragePath[];
  /** Text search query */
  textQuery?: string;
  /** Text search change */
  onTextQueryChange?: (query: string) => void;
  /** Class overrides */
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function getRulesForType(rules: FilterRule[], type: FilterRuleType): FilterRule[] {
  return rules.filter((r) => r.rule_type === type);
}

function getSelectedIdsForType(
  rules: FilterRule[],
  type: FilterRuleType
): number[] {
  return getRulesForType(rules, type)
    .map((r) => (r.value ? parseInt(r.value, 10) : null))
    .filter((v): v is number => v !== null);
}

function getRuleLabel(rule: FilterRule, lookups: {
  correspondents: Correspondent[];
  documentTypes: DocumentType[];
  tags: Tag[];
  storagePaths: StoragePath[];
}): { label: string; value: string; color?: string } {
  const info = FILTER_RULE_TYPES.find((t) => t.id === rule.rule_type);
  const label = info?.name || `Rule ${rule.rule_type}`;

  switch (rule.rule_type) {
    case FilterRuleType.CORRESPONDENT_IS: {
      const c = lookups.correspondents.find((x) => x.id === Number(rule.value));
      return { label: "Correspondent", value: c?.name || String(rule.value) };
    }
    case FilterRuleType.DOCUMENT_TYPE_IS: {
      const dt = lookups.documentTypes.find((x) => x.id === Number(rule.value));
      return { label: "Type", value: dt?.name || String(rule.value) };
    }
    case FilterRuleType.HAS_TAGS_ALL:
    case FilterRuleType.HAS_TAGS_ANY: {
      const tag = lookups.tags.find((x) => x.id === Number(rule.value));
      return {
        label: rule.rule_type === FilterRuleType.HAS_TAGS_ALL ? "Tag (all)" : "Tag",
        value: tag?.name || String(rule.value),
        color: tag?.color,
      };
    }
    case FilterRuleType.DOES_NOT_HAVE_TAG: {
      const tag = lookups.tags.find((x) => x.id === Number(rule.value));
      return {
        label: "Exclude tag",
        value: tag?.name || String(rule.value),
        color: tag?.color,
      };
    }
    case FilterRuleType.STORAGE_PATH_IS: {
      const sp = lookups.storagePaths.find((x) => x.id === Number(rule.value));
      return { label: "Path", value: sp?.name || String(rule.value) };
    }
    case FilterRuleType.TITLE_CONTAINS:
      return { label: "Title", value: rule.value || "" };
    case FilterRuleType.CONTENT_CONTAINS:
      return { label: "Content", value: rule.value || "" };
    case FilterRuleType.CREATED_BEFORE:
      return { label: "Before", value: rule.value || "" };
    case FilterRuleType.CREATED_AFTER:
      return { label: "After", value: rule.value || "" };
    case FilterRuleType.TITLE_OR_CONTENT_CONTAINS:
      return { label: "Search", value: rule.value || "" };
    default:
      return { label, value: rule.value || "✓" };
  }
}

// ============================================================================
// Component
// ============================================================================

export function FilterEditor({
  filterRules,
  onFilterRulesChange,
  correspondents,
  documentTypes,
  tags,
  storagePaths,
  textQuery = "",
  onTextQueryChange,
  className,
}: FilterEditorProps) {
  const lookups = useMemo(
    () => ({ correspondents, documentTypes, tags, storagePaths }),
    [correspondents, documentTypes, tags, storagePaths]
  );

  // Convert taxonomy arrays to DropdownItem[]
  const correspondentItems: DropdownItem[] = useMemo(
    () => correspondents.map((c) => ({ id: c.id, name: c.name, count: c.document_count })),
    [correspondents]
  );

  const documentTypeItems: DropdownItem[] = useMemo(
    () => documentTypes.map((dt) => ({ id: dt.id, name: dt.name, count: dt.document_count })),
    [documentTypes]
  );

  const tagItems: DropdownItem[] = useMemo(
    () => tags.map((t) => ({ id: t.id, name: t.name, color: t.color, count: t.document_count })),
    [tags]
  );

  const storagePathItems: DropdownItem[] = useMemo(
    () => storagePaths.map((sp) => ({ id: sp.id, name: sp.name, count: sp.document_count })),
    [storagePaths]
  );

  // Selection state derived from rules
  const selectedCorrespondentIds = getSelectedIdsForType(filterRules, FilterRuleType.CORRESPONDENT_IS);
  const selectedDocTypeIds = getSelectedIdsForType(filterRules, FilterRuleType.DOCUMENT_TYPE_IS);
  const selectedTagIds = getSelectedIdsForType(filterRules, FilterRuleType.HAS_TAGS_ALL);
  const selectedPathIds = getSelectedIdsForType(filterRules, FilterRuleType.STORAGE_PATH_IS);

  // Generic handler to update rules for a given type
  const handleDropdownChange = useCallback(
    (ruleType: FilterRuleType, ids: (number | string)[]) => {
      // Remove existing rules of this type
      const otherRules = filterRules.filter((r) => r.rule_type !== ruleType);
      // Add new rules
      const newRules = ids.map((id) => ({
        rule_type: ruleType,
        value: String(id),
      }));
      onFilterRulesChange([...otherRules, ...newRules]);
    },
    [filterRules, onFilterRulesChange]
  );

  // Remove a specific rule
  const removeRule = useCallback(
    (index: number) => {
      const next = filterRules.filter((_, i) => i !== index);
      onFilterRulesChange(next);
    },
    [filterRules, onFilterRulesChange]
  );

  // Clear all filters
  const clearAll = useCallback(() => {
    onFilterRulesChange([]);
    onTextQueryChange?.("");
  }, [onFilterRulesChange, onTextQueryChange]);

  const hasActiveFilters = filterRules.length > 0 || textQuery.length > 0;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Row 1: Filter dropdowns + text search */}
      <div className="flex items-center gap-2 flex-wrap">
        <MixerHorizontalIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />

        {/* Text search */}
        {onTextQueryChange && (
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={textQuery}
              onChange={(e) => onTextQueryChange(e.target.value)}
              placeholder="Search documents…"
              className={cn(
                "h-8 w-48 rounded-md border bg-transparent pl-7 pr-2 text-sm",
                "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              )}
            />
          </div>
        )}

        {/* Taxonomy dropdowns */}
        <FilterableDropdown
          label="Correspondent"
          items={correspondentItems}
          selectedIds={selectedCorrespondentIds}
          onChange={(ids) => handleDropdownChange(FilterRuleType.CORRESPONDENT_IS, ids)}
          showCounts
          nullable
        />

        <FilterableDropdown
          label="Type"
          items={documentTypeItems}
          selectedIds={selectedDocTypeIds}
          onChange={(ids) => handleDropdownChange(FilterRuleType.DOCUMENT_TYPE_IS, ids)}
          showCounts
          nullable
        />

        <FilterableDropdown
          label="Tags"
          items={tagItems}
          selectedIds={selectedTagIds}
          onChange={(ids) => handleDropdownChange(FilterRuleType.HAS_TAGS_ALL, ids)}
          multiple
          showCounts
        />

        <FilterableDropdown
          label="Storage path"
          items={storagePathItems}
          selectedIds={selectedPathIds}
          onChange={(ids) => handleDropdownChange(FilterRuleType.STORAGE_PATH_IS, ids)}
          showCounts
          nullable
        />

        {/* Clear all */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-muted-foreground hover:text-destructive"
          >
            <Cross2Icon className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Row 2: Active filter chips */}
      {filterRules.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pl-6">
          {filterRules.map((rule, index) => {
            const { label, value, color } = getRuleLabel(rule, lookups);
            return (
              <ClearableBadge
                key={`${rule.rule_type}-${rule.value}-${index}`}
                label={label}
                value={value}
                color={color}
                onRemove={() => removeRule(index)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
