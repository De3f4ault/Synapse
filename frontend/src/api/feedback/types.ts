/**
 * Feedback API Types
 * Matches backend schemas/search_feedback.py
 */

export type FeedbackIntent = "retrieve_context" | "navigate" | "diagnose";
export type FeedbackSource = "chat" | "cmdk" | "dashboard" | "workflow_automation";

export type FeedbackEventType =
    | "answer_accepted"               // Chat: User didn't ask followup/regenerate
    | "answer_rejected"               // Chat: User regenerated/downvoted
    | "clarification_requested"       // Chat: User asked for details
    | "result_clicked"                // CMD+K: User followed link
    | "result_ignored"                // CMD+K: User closed without clicking
    | "surfaced_but_skipped"          // List: Item was valid but not chosen
    | "system_event";                 // Generic system signal

/**
 * FeedbackSource indicates explicit user vs implicit system signals.
 * Maps to backend FeedbackSource enum.
 */
export type FeedbackSourceType = "user" | "system";

export interface FeedbackEvent {
    event_id: string;
    timestamp: string;

    // Identity (required by backend)
    user_id: number;

    // Context
    query: string;  // The query/question that triggered this interaction
    intent: FeedbackIntent;
    surface: FeedbackSource;

    // Evidence Scope
    available_evidence_ids: string[];
    used_evidence_ids: string[];

    // Quality Signals
    avg_confidence?: number | null;
    is_grounded: boolean;

    // Outcome
    event_type: FeedbackEventType;
    source: FeedbackSourceType;  // Required: "user" for explicit, "system" for implicit

    // Optional
    dwell_time_ms?: number | null;
}

export interface QualifiedSignal {
    entity_id: {
        id: string | number;
        type: string;
        authority: string;
        store: string;
        root_id: string | number | null;
    };
    signal_type: string;
    confidence_weight: number;
    learning_value: number;
    source: string;
    timestamp: string;
}
