/**
 * useForecast - Hook for fetching review forecast
 * 
 * Queries: /api/v1/analytics/forecast
 * Provides: Due today, tomorrow, this week, overdue counts
 */

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { OpenAPI } from "@/api/client";

export interface ReviewForecast {
    due_today: number;
    due_tomorrow: number;
    due_this_week: number;
    overdue: number;
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

export function useForecast() {
    return useQuery({
        queryKey: ["analytics", "forecast"],
        queryFn: async (): Promise<ReviewForecast> => {
            const headers = await getAuthHeaders();
            const response = await axios.get<ReviewForecast>(
                `${OpenAPI.BASE}/api/v1/analytics/forecast`,
                { headers, withCredentials: true }
            );
            return response.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: true,
    });
}
