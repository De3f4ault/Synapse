/**
 * useTaxonomyCRUD — TanStack Query mutations for all 4 taxonomy types
 *
 * Provides create/update/delete mutations with automatic cache invalidation.
 * Built on top of the generic useTaxonomy factory from Sprint 1.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/api/generated/client/client";

// ============================================================================
// Types
// ============================================================================

interface TaxonomyMutationData {
  name: string;
  match?: string;
  matching_algorithm?: number;
  is_insensitive?: boolean;
  // Tag-specific
  color?: string;
  is_inbox_tag?: boolean;
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
      const res = await client.post(basePath, {
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TaxonomyMutationData }) => {
      const res = await client.put(`${basePath}${id}/`, {
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      await client.delete(`${basePath}${id}/`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
  });

  return { create, update, remove };
}

// ============================================================================
// Exports
// ============================================================================

export function useCorrespondentCRUD() {
  return useTaxonomyMutations("/api/correspondents/", "correspondents");
}

export function useDocumentTypeCRUD() {
  return useTaxonomyMutations("/api/document_types/", "document_types");
}

export function useTagCRUD() {
  return useTaxonomyMutations("/api/tags/", "tags");
}

export function useStoragePathCRUD() {
  return useTaxonomyMutations("/api/storage_paths/", "storage_paths");
}
