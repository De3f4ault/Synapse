/**
 * useTaxonomyCRUD — TanStack Query mutations for all 4 taxonomy types
 *
 * Provides create/update/delete mutations with automatic cache invalidation.
 *
 * API paths from router.py:
 *   /api/correspondents/    (POST, PUT /{id}, DELETE /{id})
 *   /api/document-types/    (POST, PUT /{id}, DELETE /{id})
 *   /api/tags/              (POST, PUT /{id}, DELETE /{id})
 *   /api/storage-paths/     (POST, PUT /{id}, DELETE /{id})
 *
 * Backend contracts (from schemas):
 *   POST   → 201 + JSON body
 *   PUT    → 200 + JSON body
 *   DELETE → 204 No Content (no body)
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// Types
// ============================================================================

export interface TaxonomyMutationData {
  name: string;
  match?: string;
  matching_algorithm?: number;
  is_insensitive?: boolean;
  // Tag-specific
  color?: string;
  is_inbox_tag?: boolean;
  parent_id?: number | null;
  // StoragePath-specific
  path?: string;
}

// ============================================================================
// Generic CRUD factory
// ============================================================================

function useTaxonomyMutations(basePath: string, queryKey: string) {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async (data: TaxonomyMutationData) => {
      const res = await fetch(basePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to create (${res.status})`);
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TaxonomyMutationData }) => {
      const res = await fetch(`${basePath}${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to update (${res.status})`);
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${basePath}${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      // Backend returns 204 No Content — no JSON body to parse
      if (!res.ok) {
        throw new Error(`Failed to delete (${res.status})`);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
  });

  return { create, update, remove };
}

// ============================================================================
// Exports — paths match router.py exactly
// ============================================================================

export function useCorrespondentCRUD() {
  return useTaxonomyMutations("/api/correspondents/", "correspondents");
}

export function useDocumentTypeCRUD() {
  return useTaxonomyMutations("/api/document-types/", "document_types");
}

export function useTagCRUD() {
  return useTaxonomyMutations("/api/tags/", "tags");
}

export function useStoragePathCRUD() {
  return useTaxonomyMutations("/api/storage-paths/", "storage_paths");
}
