/**
 * useTaxonomy — TanStack Query hooks for DMS taxonomy CRUD
 *
 * Provides hooks for correspondents, document types, tags, and storage paths.
 * All hooks follow the same pattern: list + create + update + delete.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  Correspondent,
  CorrespondentCreate,
  DocumentType,
  DocumentTypeCreate,
  Tag,
  TagCreate,
  StoragePath,
  StoragePathCreate,
} from "../core/types/dms";

// ============================================================================
// Generic CRUD factory
// ============================================================================

interface CrudOptions {
  /** Query key prefix */
  key: string;
  /** API endpoint base path */
  endpoint: string;
}

function useCrudHooks<T extends { id: number }, TCreate>({
  key,
  endpoint,
}: CrudOptions) {
  const queryClient = useQueryClient();

  const listQuery = useQuery<T[]>({
    queryKey: [key],
    queryFn: async () => {
      const res = await fetch(`/api/${endpoint}/`, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch ${key}`);
      const data = await res.json();
      // API may return { results: [...] } or just [...]
      return Array.isArray(data) ? data : data.results || [];
    },
    staleTime: 60_000, // 1 minute
  });

  const createMutation = useMutation<T, Error, TCreate>({
    mutationFn: async (payload) => {
      const res = await fetch(`/api/${endpoint}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Failed to create ${key}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [key] });
    },
  });

  const updateMutation = useMutation<
    T,
    Error,
    { id: number; data: Partial<TCreate> }
  >({
    mutationFn: async ({ id, data }) => {
      const res = await fetch(`/api/${endpoint}/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`Failed to update ${key}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [key] });
    },
  });

  const deleteMutation = useMutation<void, Error, number>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/${endpoint}/${id}/`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to delete ${key}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [key] });
    },
  });

  return {
    data: listQuery.data || [],
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    error: listQuery.error,
    refetch: listQuery.refetch,
    create: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    update: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    remove: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

// ============================================================================
// Exported Hooks
// ============================================================================

export function useCorrespondents() {
  return useCrudHooks<Correspondent, CorrespondentCreate>({
    key: "correspondents",
    endpoint: "correspondents",
  });
}

export function useDocumentTypes() {
  return useCrudHooks<DocumentType, DocumentTypeCreate>({
    key: "document_types",
    endpoint: "document-types",
  });
}

export function useTags() {
  return useCrudHooks<Tag, TagCreate>({
    key: "tags",
    endpoint: "tags",
  });
}

export function useStoragePaths() {
  return useCrudHooks<StoragePath, StoragePathCreate>({
    key: "storage_paths",
    endpoint: "storage-paths",
  });
}
