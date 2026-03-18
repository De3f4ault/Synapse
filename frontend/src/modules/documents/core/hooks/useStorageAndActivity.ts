/**
 * useStorageAndActivity — Hooks for storage breakdown & recent activity endpoints.
 *
 * Uses the same auth pattern as other hooks in the codebase:
 *   - TanStack Query
 *   - OpenAPI.TOKEN for auth
 *   - axios for HTTP
 */

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { OpenAPI } from "@/api/client";

// ─── Types (matching backend schemas) ────────────────────────────────────────

export interface StorageBreakdownItem {
  type: string;
  total_bytes: number;
  file_count: number;
  color: string;
}

export interface RecentActivityItem {
  document_id: number;
  filename: string;
  action: string;      // "uploaded" | "modified" | "favorited"
  timestamp: string;   // ISO timestamp
  file_size: number | null;
}

// ─── Auth helper ────────────────────────────────────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (typeof OpenAPI.TOKEN === "function") {
    const token = await OpenAPI.TOKEN({} as any);
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }
  return {};
}

// ─── useStorageBreakdown ────────────────────────────────────────────────────

export function useStorageBreakdown() {
  return useQuery({
    queryKey: ["documents", "storage-breakdown"],
    queryFn: async (): Promise<StorageBreakdownItem[]> => {
      const headers = await getAuthHeaders();
      const response = await axios.get<StorageBreakdownItem[]>(
        `${OpenAPI.BASE}/api/v1/documents/storage-breakdown`,
        { headers, withCredentials: true }
      );
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes (storage doesn't change that fast)
    refetchOnWindowFocus: false,
  });
}

// ─── useRecentActivity ──────────────────────────────────────────────────────

export function useRecentActivity(limit: number = 10) {
  return useQuery({
    queryKey: ["documents", "recent-activity", limit],
    queryFn: async (): Promise<RecentActivityItem[]> => {
      const headers = await getAuthHeaders();
      const response = await axios.get<RecentActivityItem[]>(
        `${OpenAPI.BASE}/api/v1/documents/recent-activity`,
        { headers, withCredentials: true, params: { limit } }
      );
      return response.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
  });
}
