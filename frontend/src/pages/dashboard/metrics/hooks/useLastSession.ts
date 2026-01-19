/**
 * useLastSession - Hook for fetching last session quality
 * 
 * Queries: /api/v1/analytics/last-session
 * Session boundary: 45-min window from last activity
 */

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { OpenAPI } from "@/api/client";

export interface LastSessionStats {
    cards_reviewed: number;
    duration_minutes: number;
    accuracy_percent: number;
    quality_label: string;
    ended_at: string | null;
    has_session: boolean;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
    if (typeof OpenAPI.TOKEN === "function") {
        const token = await OpenAPI.TOKEN({} as any);
        if (token) {
            return { Authorization: `Bearer ${token}` };
        }
    }
    return {};
}

export function useLastSession() {
    return useQuery({
        queryKey: ["analytics", "last-session"],
        queryFn: async (): Promise<LastSessionStats> => {
            const headers = await getAuthHeaders();
            const response = await axios.get<LastSessionStats>(
                `${OpenAPI.BASE}/api/v1/analytics/last-session`,
                { headers, withCredentials: true }
            );
            return response.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: true,
    });
}
