/**
 * useFilterState — URL-synced filter state for DMS document list
 *
 * Serializes filter rules, sort, and pagination to URL search params
 * so that views are bookmarkable and sharable (like Paperless-ngx).
 *
 * URL format:
 *   ?sort=created&reverse=1&page=2&rule_6=42&rule_10=5,12&rule_0=invoice
 */

import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FilterRule,
  FilterRuleType,
  DisplayMode,
  type ListViewState,
} from "../core/types/dms";

// ============================================================================
// URL Serialization
// ============================================================================

const SORT_PARAM = "sort";
const REVERSE_PARAM = "reverse";
const PAGE_PARAM = "page";
const PAGE_SIZE_PARAM = "page_size";
const DISPLAY_MODE_PARAM = "display_mode";
const RULE_PREFIX = "rule_";

function serializeRulesToParams(rules: FilterRule[]): Record<string, string> {
  const params: Record<string, string> = {};

  // Group rules by type — multi-value rules like tags get comma-joined
  const grouped = new Map<FilterRuleType, string[]>();
  for (const rule of rules) {
    if (rule.value === null) continue;
    const existing = grouped.get(rule.rule_type) || [];
    existing.push(rule.value);
    grouped.set(rule.rule_type, existing);
  }

  for (const [ruleType, values] of grouped) {
    params[`${RULE_PREFIX}${ruleType}`] = values.join(",");
  }

  return params;
}

function deserializeRulesFromParams(
  params: URLSearchParams
): FilterRule[] {
  const rules: FilterRule[] = [];

  for (const [key, value] of params.entries()) {
    if (!key.startsWith(RULE_PREFIX)) continue;
    const ruleType = parseInt(key.slice(RULE_PREFIX.length), 10) as FilterRuleType;
    if (isNaN(ruleType)) continue;

    // Multi-value rules are comma-separated
    const values = value.split(",").filter(Boolean);
    for (const v of values) {
      rules.push({ rule_type: ruleType, value: v });
    }
  }

  return rules;
}

// ============================================================================
// Hook
// ============================================================================

export function useFilterState() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Deserialize current state from URL
  const state: ListViewState = useMemo(() => {
    return {
      sortField: searchParams.get(SORT_PARAM) || "created",
      sortReverse: searchParams.get(REVERSE_PARAM) === "1",
      currentPage: parseInt(searchParams.get(PAGE_PARAM) || "1", 10),
      pageSize: searchParams.has(PAGE_SIZE_PARAM)
        ? parseInt(searchParams.get(PAGE_SIZE_PARAM)!, 10)
        : undefined,
      displayMode: (searchParams.get(DISPLAY_MODE_PARAM) as DisplayMode) || undefined,
      filterRules: deserializeRulesFromParams(searchParams),
    };
  }, [searchParams]);

  // ── Setters ──

  const setFilterRules = useCallback(
    (rules: FilterRule[]) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        // Remove all existing rule params
        for (const key of [...next.keys()]) {
          if (key.startsWith(RULE_PREFIX)) next.delete(key);
        }
        // Add new rule params
        const ruleParams = serializeRulesToParams(rules);
        for (const [k, v] of Object.entries(ruleParams)) {
          next.set(k, v);
        }
        // Reset to page 1 on filter change
        next.set(PAGE_PARAM, "1");
        return next;
      }, { replace: true });
    },
    [setSearchParams]
  );

  const setSort = useCallback(
    (field: string, reverse?: boolean) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set(SORT_PARAM, field);
        if (reverse !== undefined) {
          next.set(REVERSE_PARAM, reverse ? "1" : "0");
        }
        next.set(PAGE_PARAM, "1");
        return next;
      }, { replace: true });
    },
    [setSearchParams]
  );

  const setPage = useCallback(
    (page: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set(PAGE_PARAM, String(page));
        return next;
      }, { replace: true });
    },
    [setSearchParams]
  );

  const setDisplayMode = useCallback(
    (mode: DisplayMode) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set(DISPLAY_MODE_PARAM, mode);
        return next;
      }, { replace: true });
    },
    [setSearchParams]
  );

  const resetFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  /**
   * Load a saved view's state into the URL
   */
  const loadSavedView = useCallback(
    (viewState: ListViewState) => {
      const next = new URLSearchParams();
      next.set(SORT_PARAM, viewState.sortField);
      next.set(REVERSE_PARAM, viewState.sortReverse ? "1" : "0");
      next.set(PAGE_PARAM, String(viewState.currentPage));
      if (viewState.pageSize) next.set(PAGE_SIZE_PARAM, String(viewState.pageSize));
      if (viewState.displayMode) next.set(DISPLAY_MODE_PARAM, viewState.displayMode);
      const ruleParams = serializeRulesToParams(viewState.filterRules);
      for (const [k, v] of Object.entries(ruleParams)) {
        next.set(k, v);
      }
      setSearchParams(next, { replace: true });
    },
    [setSearchParams]
  );

  return {
    ...state,
    setFilterRules,
    setSort,
    setPage,
    setDisplayMode,
    resetFilters,
    loadSavedView,
  };
}
