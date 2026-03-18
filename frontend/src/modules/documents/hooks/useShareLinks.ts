/**
 * useShareLinks — TanStack Query hooks for document share links
 *
 * Backend endpoints (from shares.py, verified against router.py L86):
 *   GET    /api/documents/{docId}/share-links  → list share links
 *   POST   /api/share-links                    → create share link
 *   DELETE /api/share-links/{slug}             → revoke share link
 *
 * Ported from Paperless-ngx share-links-dialog.component.ts (168 lines):
 *   - Expiration options: 1, 7, 30, null (never)
 *   - file_version: "archive" or "original"
 *   - Slug-based anonymous access URLs
 *
 * Backend response shape (from ShareLinkResponse in schemas/permission.py):
 *   { id, slug, document_id, created_by, expiration, file_version, url, created_at }
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// Types (matching ShareLinkResponse from backend schemas/permission.py)
// ============================================================================

export interface ShareLink {
  id: number;
  slug: string;
  document_id: number;
  created_by: number;
  expiration: string | null;
  file_version: string;
  url: string;
  created_at: string;
}

/** Matches ShareLinkCreate schema */
export interface CreateShareLinkPayload {
  document_id: number;
  file_version: "archive" | "original";
  expires_in_days: number | null;
}

/**
 * Expiration options — exact match of Paperless L24-29
 */
export const EXPIRATION_OPTIONS = [
  { label: "1 day", value: 1 },
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "Never", value: null },
] as const;

// ============================================================================
// List share links for a document
// ============================================================================

export function useDocumentShareLinks(documentId: number | null) {
  return useQuery<ShareLink[]>({
    queryKey: ["shareLinks", documentId],
    queryFn: async () => {
      if (!documentId) return [];
      const res = await fetch(`/api/documents/${documentId}/share-links`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to fetch share links (${res.status})`);
      return res.json();
    },
    enabled: !!documentId,
    staleTime: 30_000,
  });
}

// ============================================================================
// Create a share link
// ============================================================================

export function useCreateShareLink() {
  const qc = useQueryClient();

  return useMutation<ShareLink, Error, CreateShareLinkPayload>({
    mutationFn: async (payload) => {
      const res = await fetch("/api/share-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to create share link (${res.status})`);
      }
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["shareLinks", data.document_id] });
    },
  });
}

// ============================================================================
// Revoke (delete) a share link
// ============================================================================

export function useRevokeShareLink() {
  const qc = useQueryClient();

  return useMutation<void, Error, { slug: string; documentId: number }>({
    mutationFn: async ({ slug }) => {
      const res = await fetch(`/api/share-links/${slug}`, {
        method: "DELETE",
        credentials: "include",
      });
      // Backend returns 204 No Content
      if (!res.ok) {
        throw new Error(`Failed to revoke share link (${res.status})`);
      }
    },
    onSuccess: (_, { documentId }) => {
      qc.invalidateQueries({ queryKey: ["shareLinks", documentId] });
    },
  });
}

// ============================================================================
// Helpers (matching Paperless share-links-dialog L91-103)
// ============================================================================

/**
 * Build the public share URL from a share link slug.
 * Matching Paperless getShareUrl (L91-96).
 */
export function getShareUrl(slug: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/share/${slug}`;
}

/**
 * Calculate days remaining until expiration.
 * Matching Paperless getDaysRemaining (L98-103).
 */
export function getDaysRemaining(expiration: string | null): string | null {
  if (!expiration) return null;
  const days = Math.round(
    (Date.parse(expiration) - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (days <= 0) return "Expired";
  return days === 1 ? "1 day" : `${days} days`;
}
