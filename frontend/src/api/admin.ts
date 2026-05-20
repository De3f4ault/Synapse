/**
 * Admin Dashboard API client.
 *
 * Thin typed wrapper over fetch — uses the same auth token pattern
 * as the rest of the app (localStorage "synapse-auth" key).
 *
 * All functions are async, return typed responses, and throw on non-2xx.
 */

import { getAuthToken } from "@/api/client";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const ADMIN = `${API_BASE}/api/v1/admin`;

async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${ADMIN}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`Admin API ${path} failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReplicationSlotStatus {
  slot_name: string;
  active: boolean;
  wal_lag_human: string;
  wal_lag_bytes: number;
  severity: "OK" | "WARNING" | "CRITICAL";
}

export interface SubscriptionStatus {
  subname: string;
  subenabled: boolean;
  subscription_lag_bytes: number | null;
  lag_human: string | null;
  latest_end_time: string | null;
  seconds_since_last_receive: number | null;
  severity: "OK" | "WARNING" | "CRITICAL" | "UNKNOWN";
}

export interface ReplicationHealthResponse {
  primary_slots: ReplicationSlotStatus[];
  replica_subscription: SubscriptionStatus | null;
  data_as_of: string | null;
}

export interface DatabaseServerHealthResponse {
  db_size_human: string;
  db_size_bytes: number;
  active_connections: number;
  idle_in_transaction: number;
  long_running_queries: number;
  table_cache_hit_ratio: number | null;
  index_cache_hit_ratio: number | null;
  total_dead_tuples: number | null;
  total_live_tuples: number | null;
  autovacuum_workers_active: number;
}

export interface AIUsageDailyCost {
  metric_date: string;
  daily_active_users: number;
  total_tokens_burned: number | null;
  total_cost_usd: number | null;
  avg_cost_per_call: number | null;
  total_api_calls: number;
  failed_calls: number;
  failure_rate_pct: number | null;
  grounding_invocations: number;
  avg_latency_ms: number | null;
  flash_model_calls: number;
  pro_model_calls: number;
}

export interface AIUsageCostsResponse {
  rows: AIUsageDailyCost[];
  data_as_of: string | null;
}

export interface AgentPerfRow {
  agent_type: string;
  day: string;
  total_runs: number;
  failed_runs: number;
  failure_rate_pct: number | null;
  avg_react_iterations: number | null;
  avg_execution_seconds: number | null;
  avg_tokens_per_run: number | null;
  total_cost_usd: number | null;
  most_common_error: string | null;
}

export interface AgentPerformanceResponse {
  rows: AgentPerfRow[];
  data_as_of: string | null;
}

export interface DocumentPipelineRow {
  processing_status: string;
  document_count: number;
  total_bytes: number | null;
  total_size_human: string | null;
  avg_file_size_bytes: number | null;
  ocr_processed_count: number;
  oldest_in_status: string | null;
  newest_update: string | null;
}

export interface DocumentPipelineResponse {
  pipeline: DocumentPipelineRow[];
  stuck_parsing: number;
  stuck_chunking: number;
  data_as_of: string | null;
}

export interface WebhookDeliveryRow {
  day: string;
  event_type: string;
  total_deliveries: number;
  successful: number;
  failed: number;
  pending: number;
  success_rate_pct: number | null;
  avg_attempts_per_delivery: number | null;
  max_attempts_seen: number | null;
}

export interface WebhookDeliveryResponse {
  rows: WebhookDeliveryRow[];
  data_as_of: string | null;
}

export interface WorkflowExecutionRow {
  week: string;
  trigger_label: string;
  total_executions: number;
  unique_docs_processed: number;
}

export interface WorkflowExecutionResponse {
  rows: WorkflowExecutionRow[];
  data_as_of: string | null;
}

export interface LearningActivityRow {
  day: string;
  active_learners: number;
  total_study_minutes: number | null;
  platform_avg_accuracy: number | null;
  flashcard_reviews: number;
  quiz_attempts: number;
  grounded_answers: number;
  completed_sessions: number;
}

export interface LearningActivityResponse {
  rows: LearningActivityRow[];
  data_as_of: string | null;
}

export interface QdrantCollectionInfo {
  collection_name: string;
  vector_count: number | null;
  indexed_vector_count: number | null;
  points_count: number | null;
  status: string;
  optimizer_ok: boolean;
}

export interface QdrantHealthResponse {
  collections: QdrantCollectionInfo[];
  total_collections: number;
}

export interface CeleryWorkerResponse {
  active_workers: string[];
  worker_count: number;
  queue_depths: Record<string, number>;
  total_active_tasks: number;
}

export interface AdminUserRow {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  last_login: string | null;
  total_storage_bytes: number;
  total_storage_human: string;
  document_count: number;
}

export interface UserListResponse {
  users: AdminUserRow[];
  total: number;
  page: number;
  page_size: number;
}

// ─── API Functions ─────────────────────────────────────────────────────────────

export const adminApi = {
  getReplicationHealth: () =>
    adminFetch<ReplicationHealthResponse>("/replication-health"),

  getDbHealth: () =>
    adminFetch<DatabaseServerHealthResponse>("/db-health"),

  getAIUsageCosts: (days = 30) =>
    adminFetch<AIUsageCostsResponse>(`/ai-usage-costs?days=${days}`),

  getAgentPerformance: (days = 30) =>
    adminFetch<AgentPerformanceResponse>(`/agent-performance?days=${days}`),

  getDocumentPipeline: () =>
    adminFetch<DocumentPipelineResponse>("/document-pipeline"),

  getWebhookDelivery: (days = 14) =>
    adminFetch<WebhookDeliveryResponse>(`/webhook-delivery?days=${days}`),

  getWorkflowStats: (weeks = 12) =>
    adminFetch<WorkflowExecutionResponse>(`/workflow-stats?weeks=${weeks}`),

  getLearningActivity: (days = 30) =>
    adminFetch<LearningActivityResponse>(`/learning-activity?days=${days}`),

  getQdrantHealth: () =>
    adminFetch<QdrantHealthResponse>("/qdrant-health"),

  getWorkerStatus: () =>
    adminFetch<CeleryWorkerResponse>("/worker-status"),

  listUsers: (page = 1, pageSize = 25) =>
    adminFetch<UserListResponse>(`/users?page=${page}&page_size=${pageSize}`),

  suspendUser: (userId: number) =>
    adminFetch<{ user_id: number; is_active: boolean }>(
      `/users/${userId}/suspend`,
      { method: "PATCH" }
    ),

  reinstateUser: (userId: number) =>
    adminFetch<{ user_id: number; is_active: boolean }>(
      `/users/${userId}/reinstate`,
      { method: "PATCH" }
    ),
};
