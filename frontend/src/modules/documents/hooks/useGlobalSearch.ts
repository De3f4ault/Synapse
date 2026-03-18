/**
 * useGlobalSearch — TanStack Query hook for multi-entity search
 *
 * Searches documents, correspondents, document types, tags
 * simultaneously. Returns grouped results for the command palette.
 *
 * API paths from router.py:
 *   /api/documents/?search=     (search param on list_documents)
 *   /api/correspondents/        (no search param on backend — filter client-side)
 *   /api/document-types/        (hyphenated, from router.py L77)
 *   /api/tags/                  (no search param — filter client-side)
 *   /api/saved-views/           (hyphenated, from router.py L80)
 */

import { useQuery } from "@tanstack/react-query";

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
// Helpers
// ============================================================================

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : data.results || [];
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

      const q = encodeURIComponent(query);

      // Parallel requests — documents have server-side search,
      // taxonomy endpoints return all items (we filter client-side)
      const [docsRes, corrsRes, typesRes, tagsRes, viewsRes] = await Promise.allSettled([
        fetchJson(`/api/documents/?search=${q}&page_size=5`),
        fetchJson(`/api/correspondents/`),
        fetchJson(`/api/document-types/`),
        fetchJson(`/api/tags/`),
        fetchJson(`/api/saved-views/`),
      ]);

      const extract = (result: PromiseSettledResult<unknown>): Record<string, unknown>[] => {
        if (result.status === "fulfilled") {
          return result.value as Record<string, unknown>[];
        }
        return [];
      };

      const lowerQ = query.toLowerCase();
      const nameMatch = (item: Record<string, unknown>) =>
        ((item.name as string) || "").toLowerCase().includes(lowerQ);

      const docItems = extract(docsRes);
      const corrItems = extract(corrsRes).filter(nameMatch);
      const typeItems = extract(typesRes).filter(nameMatch);
      const tagItems = extract(tagsRes).filter(nameMatch);
      const viewItems = extract(viewsRes).filter(nameMatch);

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
        savedViews: viewItems.slice(0, 5).map((v) => ({
          id: v.id as number,
          type: "savedView" as const,
          name: v.name as string,
        })),
      };
    },
    enabled: query.length >= 2,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
