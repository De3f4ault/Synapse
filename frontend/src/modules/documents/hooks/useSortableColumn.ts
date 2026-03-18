/**
 * useSortableColumn — Hook for sortable table column headers
 *
 * Ported from Paperless-ngx sortable.directive.ts:
 *   - Click header → ascending
 *   - Click again → descending
 *   - Click third time → no sort (reset)
 *   - Visual indicator: arrow up / arrow down / none
 *   - Supports persisting sort state via callback
 *
 * Usage:
 *   const { sortField, sortDir, toggle, getSortProps } = useSortableColumn("created")
 *   <th {...getSortProps("title")}>Title</th>
 */

import { useState, useCallback } from "react";

// ============================================================================
// Types
// ============================================================================

export type SortDirection = "asc" | "desc" | null;

interface SortState {
  field: string | null;
  direction: SortDirection;
}

interface SortableColumnResult {
  /** Currently sorted field */
  sortField: string | null;
  /** Current sort direction */
  sortDir: SortDirection;

  /** Toggle sort on a field (asc → desc → none) */
  toggle: (field: string) => void;

  /** Reset sort */
  reset: () => void;

  /** Check if a field is currently sorted */
  isSorted: (field: string) => boolean;

  /** Get direction for a specific field */
  getDirection: (field: string) => SortDirection;

  /** Get props for a sortable column header */
  getSortProps: (field: string) => {
    onClick: () => void;
    "aria-sort": "ascending" | "descending" | "none";
    style: { cursor: "pointer" };
  };
}

// ============================================================================
// Hook
// ============================================================================

export function useSortableColumn(
  defaultField?: string,
  defaultDirection?: SortDirection,
  onChange?: (field: string | null, direction: SortDirection) => void
): SortableColumnResult {
  const [sort, setSort] = useState<SortState>({
    field: defaultField || null,
    direction: defaultDirection || null,
  });

  // Matching Paperless sortable directive: click → asc → desc → none
  const toggle = useCallback(
    (field: string) => {
      setSort((prev) => {
        let next: SortState;

        if (prev.field !== field) {
          // Different column — start ascending
          next = { field, direction: "asc" };
        } else if (prev.direction === "asc") {
          // Same column, was asc → desc
          next = { field, direction: "desc" };
        } else if (prev.direction === "desc") {
          // Same column, was desc → reset
          next = { field: null, direction: null };
        } else {
          // Was null → asc
          next = { field, direction: "asc" };
        }

        onChange?.(next.field, next.direction);
        return next;
      });
    },
    [onChange]
  );

  const reset = useCallback(() => {
    setSort({ field: null, direction: null });
    onChange?.(null, null);
  }, [onChange]);

  const isSorted = useCallback(
    (field: string) => sort.field === field && sort.direction !== null,
    [sort]
  );

  const getDirection = useCallback(
    (field: string): SortDirection =>
      sort.field === field ? sort.direction : null,
    [sort]
  );

  const getSortProps = useCallback(
    (field: string) => ({
      onClick: () => toggle(field),
      "aria-sort": (sort.field === field
        ? sort.direction === "asc"
          ? "ascending"
          : sort.direction === "desc"
            ? "descending"
            : "none"
        : "none") as "ascending" | "descending" | "none",
      style: { cursor: "pointer" as const },
    }),
    [sort, toggle]
  );

  return {
    sortField: sort.field,
    sortDir: sort.direction,
    toggle,
    reset,
    isSorted,
    getDirection,
    getSortProps,
  };
}
