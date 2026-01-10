import { useQuery } from "@tanstack/react-query";
import { OpenAPI } from "@/api/client";
import type { EntitySearchResult } from "../types";
import type { EntityType } from "@/shared/core/entity";

interface UseEntitySearchOptions {
    enabled?: boolean;
    limit?: number;
    types?: EntityType[];
}

/**
 * Hook to search for entities across the platform.
 * 
 * Uses the centralized /api/v1/entities/search endpoint.
 * Supports debouncing (handled by caller passing debounced query) and caching.
 */
export function useEntitySearch(query: string, options: UseEntitySearchOptions = {}) {
    const { enabled = true, limit = 10, types } = options;

    return useQuery({
        queryKey: ["entities", "search", query, types, limit],
        queryFn: async (): Promise<EntitySearchResult[]> => {
            if (!query.trim()) return [];

            const params = new URLSearchParams();
            params.append("q", query);
            params.append("limit", limit.toString());

            if (types && types.length > 0) {
                types.forEach(t => params.append("types", t));
            }

            const token = await OpenAPI.TOKEN();
            const headers: HeadersInit = {
                "Content-Type": "application/json",
            };

            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            const response = await fetch(`${OpenAPI.BASE}/api/v1/entities/search?${params.toString()}`, {
                method: "GET",
                headers,
            });

            if (!response.ok) {
                throw new Error(`Search failed: ${response.statusText}`);
            }

            const data = await response.json();
            return data.results;
        },
        enabled: enabled && query.length > 0,
        staleTime: 1000 * 60 * 1, // Cache for 1 minute
        retry: 1,
    });
}
