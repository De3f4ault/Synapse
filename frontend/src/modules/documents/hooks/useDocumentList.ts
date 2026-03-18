/**
 * useDocumentList — TanStack Query hook for fetching DMS documents
 *
 * Converts filter rules, sort, and pagination into API query params
 * and manages selection state for bulk operations.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useCallback, useEffect } from "react";
import type { FilterRule } from "../core/types/dms";

// ============================================================================
// API Query Params Builder
// ============================================================================

interface DocumentListParams {
  page: number;
  pageSize: number;
  sortField: string;
  sortReverse: boolean;
  filterRules: FilterRule[];
  textQuery?: string;
}

function buildQueryParams(params: DocumentListParams): Record<string, string> {
  const q: Record<string, string> = {
    page: String(params.page),
    page_size: String(params.pageSize),
    ordering: params.sortReverse
      ? `-${params.sortField}`
      : params.sortField,
  };

  // Map filter rules to API query params
  for (const rule of params.filterRules) {
    if (rule.value === null) continue;
    switch (rule.rule_type) {
      case 0: // TITLE_CONTAINS
        q["title__icontains"] = rule.value;
        break;
      case 1: // CONTENT_CONTAINS
        q["content__icontains"] = rule.value;
        break;
      case 6: // CORRESPONDENT_IS
        q["correspondent__id"] = rule.value;
        break;
      case 10: // HAS_TAGS_ALL
        q["tags__id__all"] = q["tags__id__all"]
          ? `${q["tags__id__all"]},${rule.value}`
          : rule.value;
        break;
      case 11: // HAS_TAGS_ANY
        q["tags__id__in"] = q["tags__id__in"]
          ? `${q["tags__id__in"]},${rule.value}`
          : rule.value;
        break;
      case 12: // DOES_NOT_HAVE_TAG
        q["tags__id__none"] = q["tags__id__none"]
          ? `${q["tags__id__none"]},${rule.value}`
          : rule.value;
        break;
      case 13: // DOCUMENT_TYPE_IS
        q["document_type__id"] = rule.value;
        break;
      case 16: // CREATED_BEFORE
        q["created__date__lt"] = rule.value;
        break;
      case 17: // CREATED_AFTER
        q["created__date__gt"] = rule.value;
        break;
      case 25: // STORAGE_PATH_IS
        q["storage_path__id"] = rule.value;
        break;
      case 28: // TITLE_OR_CONTENT_CONTAINS
        q["title_content"] = rule.value;
        break;
      case 29: // FULLTEXT_QUERY
        q["query"] = rule.value;
        break;
    }
  }

  if (params.textQuery) {
    q["title_content"] = params.textQuery;
  }

  return q;
}

// ============================================================================
// Hook
// ============================================================================

interface UseDocumentListOptions {
  page: number;
  pageSize?: number;
  sortField: string;
  sortReverse: boolean;
  filterRules: FilterRule[];
  textQuery?: string;
  enabled?: boolean;
}

export interface DocumentListResult {
  count: number;
  results: Array<Record<string, unknown>>;
  all: number[];
}

export function useDocumentList({
  page,
  pageSize = 25,
  sortField,
  sortReverse,
  filterRules,
  textQuery = "",
  enabled = true,
}: UseDocumentListOptions) {
  const queryClient = useQueryClient();

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Build query params
  const queryParams = useMemo(
    () =>
      buildQueryParams({
        page,
        pageSize,
        sortField,
        sortReverse,
        filterRules,
        textQuery,
      }),
    [page, pageSize, sortField, sortReverse, filterRules, textQuery]
  );

  // Query key includes all filter state
  const queryKey = useMemo(
    () => ["documents", "list", queryParams],
    [queryParams]
  );

  // Fetch documents
  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<DocumentListResult> => {
      const params = new URLSearchParams(queryParams);
      const response = await fetch(`/api/documents/?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.statusText}`);
      }
      return response.json();
    },
    enabled,
    staleTime: 30_000, // 30 seconds
    placeholderData: (prev) => prev, // keep previous data while loading
  });

  // Prefetch next page
  useEffect(() => {
    if (!query.data) return;
    const totalPages = Math.ceil(query.data.count / pageSize);
    if (page < totalPages) {
      const nextParams = buildQueryParams({
        page: page + 1,
        pageSize,
        sortField,
        sortReverse,
        filterRules,
        textQuery,
      });
      queryClient.prefetchQuery({
        queryKey: ["documents", "list", nextParams],
        queryFn: async () => {
          const params = new URLSearchParams(nextParams);
          const response = await fetch(`/api/documents/?${params.toString()}`, {
            credentials: "include",
          });
          return response.json();
        },
        staleTime: 30_000,
      });
    }
  }, [query.data, page, pageSize, sortField, sortReverse, filterRules, textQuery, queryClient]);

  // Reset selection when filters/page change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, filterRules, textQuery, sortField, sortReverse]);

  // Selection helpers
  const toggleSelection = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (!query.data?.results) return;
    const allIds = query.data.results.map((d) => (d as { id: number }).id);
    setSelectedIds(new Set(allIds));
  }, [query.data]);

  const selectNone = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isAllSelected = useMemo(() => {
    if (!query.data?.results?.length) return false;
    return query.data.results.every((d) =>
      selectedIds.has((d as { id: number }).id)
    );
  }, [query.data, selectedIds]);

  // Pagination info
  const totalPages = query.data ? Math.ceil(query.data.count / pageSize) : 0;
  const totalCount = query.data?.count || 0;

  return {
    // Data
    documents: (query.data?.results || []) as Array<Record<string, unknown>>,
    totalCount,
    totalPages,
    // State
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    // Selection
    selectedIds,
    toggleSelection,
    selectAll,
    selectNone,
    isAllSelected,
    selectedCount: selectedIds.size,
    // Actions
    refetch: query.refetch,
  };
}
