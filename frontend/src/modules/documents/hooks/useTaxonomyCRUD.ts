/**
 * useTaxonomyCRUD — TanStack Query mutations for all 4 taxonomy types
 *
 * Provides create/update/delete mutations with automatic cache invalidation.
 *
 * API paths from router.py (no trailing slashes to avoid 307 redirects):
 *   /api/v1/correspondents    (POST, PUT /{id}, DELETE /{id})
 *   /api/v1/document-types    (POST, PUT /{id}, DELETE /{id})
 *   /api/v1/tags              (POST, PUT /{id}, DELETE /{id})
 *   /api/v1/storage-paths     (POST, PUT /{id}, DELETE /{id})
 *
 * Backend contracts (from schemas):
 *   POST   → 201 + JSON body
 *   PUT    → 200 + JSON body
 *   DELETE → 204 No Content (no body)
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthToken } from "@/api/client";

// ============================================================================
// Auth helpers
// ============================================================================

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

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
        headers: authHeaders(),
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
      const res = await fetch(`${basePath}/${id}`, {
        method: "PUT",
        headers: authHeaders(),
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
      const res = await fetch(`${basePath}/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
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
// Exports — paths match router.py (no trailing slashes)
// ============================================================================

export function useCorrespondentCRUD() {
  return useTaxonomyMutations("/api/v1/correspondents", "correspondents");
}

export function useDocumentTypeCRUD() {
  return useTaxonomyMutations("/api/v1/document-types", "document_types");
}

export function useTagCRUD() {
  return useTaxonomyMutations("/api/v1/tags", "tags");
}

export function useStoragePathCRUD() {
  return useTaxonomyMutations("/api/v1/storage-paths", "storage_paths");
}
