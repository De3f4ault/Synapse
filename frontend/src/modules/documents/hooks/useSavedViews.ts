/**
 * useSavedViews — TanStack Query hooks for saved view management
 *
 * List, create, update, delete saved views.
 * Each saved view stores filter rules + sort + display preferences.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { SavedView, SavedViewCreate } from "../core/types/dms";

const QUERY_KEY = "saved_views";
const ENDPOINT = "/api/saved-views";

// ============================================================================
// List
// ============================================================================

export function useSavedViews() {
  return useQuery<SavedView[]>({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const res = await fetch(`${ENDPOINT}/`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch saved views");
      const data = await res.json();
      return Array.isArray(data) ? data : data.results || [];
    },
    staleTime: 60_000,
  });
}

// ============================================================================
// Create
// ============================================================================

export function useCreateSavedView() {
  const queryClient = useQueryClient();

  return useMutation<SavedView, Error, SavedViewCreate>({
    mutationFn: async (payload) => {
      const res = await fetch(`${ENDPOINT}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create saved view");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

// ============================================================================
// Update
// ============================================================================

export function useUpdateSavedView() {
  const queryClient = useQueryClient();

  return useMutation<
    SavedView,
    Error,
    { id: number; data: Partial<SavedViewCreate> }
  >({
    mutationFn: async ({ id, data }) => {
      const res = await fetch(`${ENDPOINT}/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update saved view");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

// ============================================================================
// Delete
// ============================================================================

export function useDeleteSavedView() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      const res = await fetch(`${ENDPOINT}/${id}/`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete saved view");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
