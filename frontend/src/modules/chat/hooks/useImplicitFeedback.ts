import { useEffect, useRef } from "react";
import type { ChatMessageResponse } from "@/api/generated";
import { feedbackApi } from "@/api/feedback";
import type { FeedbackEvent } from "@/api/feedback/types";

/**
 * useImplicitFeedback - Auto-report evidence usage.
 * 
 * When the backend sends a message with specific evidence cited ("used_evidence_ids"),
 * this hook detects it and sends a feedback signal to the Telemetry Service.
 * 
 * This treats "The AI cited this and the user saw it" as a baseline trusted signal.
 */
export function useImplicitFeedback(
    sessionId: number,
    messages: ChatMessageResponse[],
    userId: number
) {
    // Track processed message IDs to avoid duplicate events
    const processedIds = useRef<Set<number>>(new Set());

    useEffect(() => {
        if (!messages.length || !userId) return;

        messages.forEach(msg => {
            // Only process assistant messages that we haven't seen yet
            // Use string comparison for role to avoid enum import issues
            if (
                msg.role === "assistant" &&
                !processedIds.current.has(msg.id) &&
                msg.id > 0 // Ignore optimistic messages
            ) {
                // Check for evidence usage in metadata
                // Middleware writes to `state.metadata.evidence_usage`.
                const metadata = (msg as any).metadata;
                const evidenceUsage = metadata?.evidence_usage;

                if (evidenceUsage && evidenceUsage.used_evidence_ids?.length > 0) {
                    // Find the user's query from the previous message
                    const msgIndex = messages.findIndex(m => m.id === msg.id);
                    const previousUserMsg = messages
                        .slice(0, msgIndex)
                        .reverse()
                        .find(m => m.role === "user");
                    const query = previousUserMsg?.content || "";

                    const event: FeedbackEvent = {
                        event_id: `impl_fb_${msg.id}_${Date.now()}`,
                        timestamp: new Date().toISOString(),
                        user_id: userId,
                        query: query,
                        intent: "retrieve_context",
                        surface: "chat",
                        available_evidence_ids: evidenceUsage.available_evidence_ids || [],
                        used_evidence_ids: evidenceUsage.used_evidence_ids,
                        event_type: "answer_accepted", // Implicit acceptance (User saw it)
                        is_grounded: true,
                        avg_confidence: evidenceUsage.avg_confidence,
                        source: "system" // Implicit signal, not explicit user feedback
                    };

                    console.log("[ImplicitFeedback] Sending signal:", event);

                    feedbackApi.submit(event).catch(err => {
                        console.error("[ImplicitFeedback] Failed to send:", err);
                    });
                }

                // Mark as processed
                processedIds.current.add(msg.id);
            }
        });
    }, [messages, sessionId, userId]);
}

