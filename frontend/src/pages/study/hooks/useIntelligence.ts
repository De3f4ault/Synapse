/**
 * useIntelligence - Hook for Graph Intelligence Engine data
 *
 * Fetches intelligence summary including:
 * - Weak concepts (mastery < 0.3)
 * - Fragile concepts (at risk of decay)
 * - High-ROI concepts (best reinforcement payoff)
 * - Recommended platform actions
 */

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { OpenAPI } from "@/api/client";

// ============================================================================
// Types (match backend schemas)
// ============================================================================

export interface WeaknessEvidence {
  source: string;
  reference_id?: string;
  reason: string;
}

export interface ConceptState {
  concept_id: string;
  concept_name?: string; // Human-readable name for display
  mastery: number;
  stability: number;
  volatility: number;
  last_reinforced_at?: string;
  weakness_evidence: WeaknessEvidence[];
}

export interface PlatformAction {
  type: string;
  target: {
    id: number | string;
    type: string;
    source_module: string;
  };
  reason: string;
  priority: number;
}

export interface IntelligenceSummary {
  weak_concepts: ConceptState[];
  fragile_concepts: ConceptState[];
  high_roi_concepts: ConceptState[];
  recommended_actions: PlatformAction[];
  generated_at: string;
}

// ============================================================================
// Hook
// ============================================================================

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (typeof OpenAPI.TOKEN === "function") {
    const token = await OpenAPI.TOKEN({} as any);
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }
  return {};
}

export function useIntelligence(limit: number = 5) {
  return useQuery({
    queryKey: ["intelligence", "summary", limit],
    queryFn: async (): Promise<IntelligenceSummary> => {
      const headers = await getAuthHeaders();
      const response = await axios.get<IntelligenceSummary>(
        `${OpenAPI.BASE}/api/v1/intelligence/summary?limit=${limit}`,
        { headers, withCredentials: true }
      );
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for fetching assistant-ready context
 */
export function useAssistantContext(sessionFocus?: string) {
  return useQuery({
    queryKey: ["intelligence", "context", sessionFocus],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const params = sessionFocus ? `?session_focus=${encodeURIComponent(sessionFocus)}` : "";
      const response = await axios.get(
        `${OpenAPI.BASE}/api/v1/intelligence/context${params}`,
        { headers, withCredentials: true }
      );
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
    enabled: false, // Only fetch when explicitly requested
  });
}
