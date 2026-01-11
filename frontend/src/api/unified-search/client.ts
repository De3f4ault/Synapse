/**
 * Unified Search API Client
 * 
 * Direct API client for the Search Intelligence Bus.
 * Uses the same auth pattern as the rest of the app.
 * TODO: Replace with generated client when api is regenerated.
 */

import axios from 'axios';
import { OpenAPI } from '@/api/client';
import type {
    UnifiedSearchRequest,
    UnifiedSearchResponse
} from './types';

/**
 * Get auth headers (same pattern as useIntelligence)
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
    if (typeof OpenAPI.TOKEN === 'function') {
        const token = await OpenAPI.TOKEN({} as any);
        if (token) {
            return { Authorization: `Bearer ${token}` };
        }
    }
    return {};
}

/**
 * Execute unified search across all engines.
 */
export async function unifiedSearch(
    request: UnifiedSearchRequest
): Promise<UnifiedSearchResponse> {
    const headers = await getAuthHeaders();
    const response = await axios.post<UnifiedSearchResponse>(
        `${OpenAPI.BASE}/api/v1/search/unified`,
        request,
        { headers, withCredentials: true }
    );
    return response.data;
}

/**
 * Execute unified search (GET variant for simple queries).
 */
export async function unifiedSearchGet(
    query: string,
    intent: string = 'navigate',
    surface: string = 'cmdk',
    limit: number = 20
): Promise<UnifiedSearchResponse> {
    const headers = await getAuthHeaders();
    const response = await axios.get<UnifiedSearchResponse>(
        `${OpenAPI.BASE}/api/v1/search/unified`,
        {
            params: {
                q: query,
                intent,
                surface,
                limit,
            },
            headers,
            withCredentials: true,
        }
    );
    return response.data;
}
