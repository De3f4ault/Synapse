/**
 * useTaxonomy — TanStack Query hooks for DMS taxonomy CRUD
 *
 * Provides hooks for correspondents, document types, tags, and storage paths.
 * All hooks follow the same pattern: list + create + update + delete.
 *
 * Uses Bearer token auth (getAuthToken) and no trailing slashes to
 * avoid FastAPI 307 redirects that strip auth credentials.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { getAuthToken } from "@/api/client";
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
// Generic CRUD factory
// ============================================================================

interface CrudOptions {
  /** Query key prefix */
  key: string;
  /** API endpoint base path (no trailing slash) */
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
      const res = await fetch(`/api/v1/${endpoint}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`Failed to fetch ${key}`);
      const data = await res.json();
      // API may return { results: [...] } or just [...]
      return Array.isArray(data) ? data : data.results || [];
    },
    staleTime: 60_000, // 1 minute
  });

  const createMutation = useMutation<T, Error, TCreate>({
    mutationFn: async (payload) => {
      const res = await fetch(`/api/v1/${endpoint}`, {
        method: "POST",
        headers: authHeaders(),
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
      const res = await fetch(`/api/v1/${endpoint}/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
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
      const res = await fetch(`/api/v1/${endpoint}/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
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
