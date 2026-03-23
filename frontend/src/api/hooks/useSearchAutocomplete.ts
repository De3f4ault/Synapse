/**
 * useSearchAutocomplete — TanStack Query hook for multi-entity autocomplete
 *
 * Wires global search / command palette to GET /api/v1/search/autocomplete
 */

import { useQuery } from "@tanstack/react-query";
import { SearchService } from "@/api/generated";

export interface AutocompleteResult {
  id: number;
  name: string;
  type: string;
}

export interface AutocompleteResponse {
  results: AutocompleteResult[];
  total: number;
}

export function useSearchAutocomplete(query: string, limit = 10) {
  return useQuery<AutocompleteResponse>({
    queryKey: ["search", "autocomplete", query, limit],
    queryFn: () =>
      SearchService.searchAutocompleteApiV1SearchAutocompleteGet(query, limit),
    enabled: query.length >= 2,
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}
