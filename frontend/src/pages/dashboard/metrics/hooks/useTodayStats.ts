/**
 * useTodayStats - Hook for fetching today's study statistics
 * 
 * Queries: /api/v1/analytics/today
 * Provides: study_time_minutes, learning_events, reviews_completed, average_accuracy
 */

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { OpenAPI } from "@/api/client";

export interface TodayStats {
    study_time_minutes: number;
    learning_events: number;
    reviews_completed: number;
    average_accuracy: number;
    data_source: string;
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

export function useTodayStats() {
    return useQuery({
        queryKey: ["analytics", "today"],
        queryFn: async (): Promise<TodayStats> => {
            const headers = await getAuthHeaders();
            const response = await axios.get<TodayStats>(
                `${OpenAPI.BASE}/api/v1/analytics/today`,
                { headers, withCredentials: true }
            );
            return response.data;
        },
        staleTime: 1000 * 60 * 2, // 2 minutes (today's stats change frequently)
        refetchOnWindowFocus: true,
    });
}
