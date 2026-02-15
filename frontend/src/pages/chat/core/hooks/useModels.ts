/**
 * useModels — React Query hook for fetching available AI models.
 *
 * Calls GET /chat/models which now returns all models from MODEL_REGISTRY
 * with provider, tier, and supports_thinking fields included.
 */

import { useQuery } from "@tanstack/react-query";
import { ChatService } from "@/api/generated";

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  maxTokens: number;
  supportsVision: boolean;
  supportsSearch: boolean;
  provider: string;         // "ollama" | "google"
  tier: string;             // "speed" | "balanced" | "reasoning" | "thinking"
  supportsThinking: boolean;
}

/** Map snake_case API response to camelCase ModelInfo */
function toModelInfo(raw: any): ModelInfo {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? "",
    capabilities: raw.capabilities ?? [],
    maxTokens: raw.max_tokens ?? 0,
    supportsVision: raw.supports_vision ?? false,
    supportsSearch: raw.supports_search ?? false,
    provider: raw.provider ?? "unknown",
    tier: raw.tier ?? "balanced",
    supportsThinking: raw.supports_thinking ?? false,
  };
}

export function useModels() {
  const query = useQuery({
    queryKey: ["chat", "models"],
    queryFn: () => ChatService.listModelsApiV1ChatModelsGet(),
    staleTime: 5 * 60 * 1000, // 5 minutes — models rarely change
    gcTime: 30 * 60 * 1000,
  });

  const models: ModelInfo[] = (query.data ?? []).map(toModelInfo);

  // Group by provider for dropdown sections
  const grouped = {
    ollama: models.filter((m) => m.provider === "ollama"),
    google: models.filter((m) => m.provider === "google"),
  };

  return {
    models,
    grouped,
    isLoading: query.isLoading,
    error: query.error,
  };
}
