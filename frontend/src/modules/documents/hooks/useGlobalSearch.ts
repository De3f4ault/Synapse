/**
 * useGlobalSearch — TanStack Query hook for multi-entity search
 *
 * Searches documents, correspondents, types, tags, saved views
 * simultaneously. Returns grouped results for the command palette.
 */

import { useQuery } from "@tanstack/react-query";
import { client } from "@/api/generated/client/client";

// ============================================================================
// Types
// ============================================================================

export interface SearchResult {
  id: number;
  type: "document" | "correspondent" | "documentType" | "tag" | "savedView" | "storagePath";
  name: string;
  /** Extra metadata for display */
  detail?: string;
  thumbnailUrl?: string | null;
  highlight?: string;
}

export interface GroupedSearchResults {
  documents: SearchResult[];
  correspondents: SearchResult[];
  documentTypes: SearchResult[];
  tags: SearchResult[];
  savedViews: SearchResult[];
}

// ============================================================================
// Hook
// ============================================================================

export function useGlobalSearch(query: string) {
  return useQuery<GroupedSearchResults>({
    queryKey: ["globalSearch", query],
    queryFn: async () => {
      if (!query || query.length < 2) {
        return { documents: [], correspondents: [], documentTypes: [], tags: [], savedViews: [] };
      }

      // Parallel requests to multiple endpoints
      const [docsRes, corrsRes, typesRes, tagsRes] = await Promise.allSettled([
        client.get(`/api/documents/?search=${encodeURIComponent(query)}&page_size=5`),
        client.get(`/api/correspondents/?search=${encodeURIComponent(query)}`),
        client.get(`/api/document_types/?search=${encodeURIComponent(query)}`),
        client.get(`/api/tags/?search=${encodeURIComponent(query)}`),
      ]);

      const extract = (result: PromiseSettledResult<unknown>): unknown[] => {
        if (result.status === "fulfilled") {
          const val = result.value as Record<string, unknown>;
          return (val?.results as unknown[]) || (Array.isArray(val) ? val : []);
        }
        return [];
      };

      const docItems = extract(docsRes) as Array<Record<string, unknown>>;
      const corrItems = extract(corrsRes) as Array<Record<string, unknown>>;
      const typeItems = extract(typesRes) as Array<Record<string, unknown>>;
      const tagItems = extract(tagsRes) as Array<Record<string, unknown>>;

      return {
        documents: docItems.slice(0, 5).map((d) => ({
          id: d.id as number,
          type: "document" as const,
          name: (d.title as string) || (d.filename as string) || `Document #${d.id}`,
          detail: d.correspondent_name as string || undefined,
          thumbnailUrl: d.thumbnail_url as string || null,
          highlight: d.content_highlight as string || undefined,
        })),
        correspondents: corrItems.slice(0, 5).map((c) => ({
          id: c.id as number,
          type: "correspondent" as const,
          name: c.name as string,
          detail: `${c.document_count || 0} docs`,
        })),
        documentTypes: typeItems.slice(0, 5).map((dt) => ({
          id: dt.id as number,
          type: "documentType" as const,
          name: dt.name as string,
          detail: `${dt.document_count || 0} docs`,
        })),
        tags: tagItems.slice(0, 5).map((t) => ({
          id: t.id as number,
          type: "tag" as const,
          name: t.name as string,
          detail: `${t.document_count || 0} docs`,
        })),
        savedViews: [], // TODO: search saved views when endpoint exists
      };
    },
    enabled: query.length >= 2,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
