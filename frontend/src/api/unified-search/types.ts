/**
 * Unified Search Types
 * 
 * These types match the backend UnifiedSearchResponse contract.
 * When the API client is regenerated, these can be replaced with generated types.
 */

// =============================================================================
// Identity Types
// =============================================================================

export type EntityType =
    | 'note'
    | 'flashcard'
    | 'document'
    | 'chunk'
    | 'concept'
    | 'conversation';

export type IdentityAuthority =
    | 'user_content'
    | 'system_derived'
    | 'knowledge_graph';

export type StoreType = 'postgres' | 'qdrant' | 'graph';

export interface EntityIdentity {
    id: string | number;
    type: EntityType;
    authority: IdentityAuthority;
    parent_id?: string | number | null;
    root_id?: string | number | null;
    store: StoreType;
}

// =============================================================================
// Search Result Types
// =============================================================================

export type SearchRole = 'navigation' | 'evidence' | 'diagnostic' | 'suggestion';
export type AssertionType = 'factual' | 'inferential' | 'heuristic';
export type EngineSource = 'hybrid' | 'rag' | 'graph' | 'local';

export interface UnifiedSearchResult {
    id: EntityIdentity;
    role: SearchRole;
    title: string;
    snippet?: string | null;
    url?: string | null;

    source: EngineSource;
    scores: Record<string, number>;
    signals: Record<string, unknown>;

    assertion_type: AssertionType;
    confidence?: number | null;

    valid_at: string;
    expires_at?: string | null;
    revision?: number | null;

    metadata: Record<string, unknown>;
}

// =============================================================================
// Context & Intent Types
// =============================================================================

export type SearchIntent =
    | 'navigate'
    | 'explore'
    | 'retrieve_context'
    | 'diagnose';

export type SearchSurface = 'cmdk' | 'chat' | 'dashboard' | 'study_hub';

export interface SearchContext {
    user_id: number;
    intent: SearchIntent;
    surface: SearchSurface;
    session_id?: string | null;
    max_latency_ms: number;
    max_results_per_engine: number;
}

// =============================================================================
// Response Types
// =============================================================================

export type EngineStatus = 'ok' | 'timeout' | 'error' | 'skipped';

export interface EngineResult {
    engine: 'hybrid' | 'rag' | 'graph';
    results: UnifiedSearchResult[];
    latency_ms: number;
    status: EngineStatus;
    error_message?: string | null;
}

export interface UnifiedSearchResponse {
    query: string;
    context: SearchContext;
    engines: EngineResult[];
    total_results: number;
    response_time_ms: number;
}

// =============================================================================
// Request Types
// =============================================================================

export interface UnifiedSearchRequest {
    query: string;
    intent?: SearchIntent;
    surface?: SearchSurface;
    max_latency_ms?: number;
    max_results_per_engine?: number;
}
