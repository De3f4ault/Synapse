/**
 * useTrash — TanStack Query hooks for the trash/recycle bin
 *
 * Ported from Paperless-ngx trash.service.ts (38 lines):
 *   GET  /api/trash/?page=N         → paginated list of trashed documents
 *   POST /api/trash/  {action: "empty",   documents?: number[]}
 *   POST /api/trash/  {action: "restore", documents:  number[]}
 *
 * Our backend uses soft-delete (deleted_at timestamp) in documents.py.
 * We query trashed docs via: GET /api/documents/?view=trash
 * Restore/empty use a dedicated trash endpoint.
 *
 * Backend contract (from documents.py L240, L346):
 *   - list_documents filters `Document.deleted_at.is_(None)` by default
 *   - delete_document sets `doc.deleted_at = datetime.utcnow()`
 *   - We'll need a /api/trash/ endpoint (or extend documents endpoint)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// Types (matching DocumentResponse from schemas/document.py)
// ============================================================================

export interface TrashedDocument {
  id: number;
  filename: string;
  file_type: string;
  file_size: number;
  deleted_at: string;
  created_at: string;
  correspondent_id: number | null;
  document_type_id: number | null;
}

// ============================================================================
// List trashed documents
// ============================================================================

export function useTrashList(page: number = 1) {
  return useQuery<TrashedDocument[]>({
    queryKey: ["trash", page],
    queryFn: async () => {
      const res = await fetch(`/api/trash/?page=${page}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to fetch trash (${res.status})`);
      const data = await res.json();
      // Backend may return paginated or flat array
      return Array.isArray(data) ? data : data.results || [];
    },
    staleTime: 30_000,
  });
}

// ============================================================================
// Restore documents from trash
// (exact match of Paperless: POST /api/trash/ {action: "restore", documents})
// ============================================================================

export function useRestoreDocuments() {
  const qc = useQueryClient();

  return useMutation<void, Error, number[]>({
    mutationFn: async (documentIds: number[]) => {
      const res = await fetch("/api/trash/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "restore",
          documents: documentIds,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Restore failed (${res.status})`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trash"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

// ============================================================================
// Empty trash (permanently delete)
// (exact match: POST /api/trash/ {action: "empty", documents?})
// ============================================================================

export function useEmptyTrash() {
  const qc = useQueryClient();

  return useMutation<void, Error, number[] | undefined>({
    mutationFn: async (documentIds?: number[]) => {
      const body: Record<string, unknown> = { action: "empty" };
      if (documentIds?.length) {
        body.documents = documentIds;
      }
      const res = await fetch("/api/trash/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Empty trash failed (${res.status})`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trash"] });
    },
  });
}
