/**
 * useCardDesignChat — AI Card Designer conversation hook.
 *
 * Wraps `useChat` from @ai-sdk/react exactly like useCardTutorChat.
 * Watches the SSE stream for the propose_card_plan tool call emitted by the
 * AI designer. When detected, parses the plan JSON and exposes it as
 * `proposedPlan` so the CardPlanProposal panel can render it.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { getAuthToken } from '@/api/client';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface SubtopicSpec {
    topic: string;
    count: number;
    style: 'basic' | 'cloze' | 'socratic' | 'scenario';
    difficulty_note: string;
}

export interface CardDesignPlan {
    deck_name: string;
    deck_id: number | null;
    subtopics: SubtopicSpec[];
    total_cards: number;
    learning_objective: string;
    source_material: string | null;
    rationale: string;
}

export interface UseCardDesignChatReturn {
    messages: UIMessage[];
    status: 'submitted' | 'streaming' | 'ready' | 'error';
    proposedPlan: CardDesignPlan | null;
    isGenerating: boolean;
    historicalCount: number;        // how many messages were loaded from history
    sendMessage: ReturnType<typeof useChat>['sendMessage'];
    attachSource: (text: string) => void;
    acceptPlan: () => Promise<{ deck_id: number; deck_name: string; cards_generated: number } | null>;
    adjustPlan: (patch: Partial<CardDesignPlan>) => void;
    resetPlan: () => void;
}

/**
 * Guard: check that a parsed object looks like a CardDesignPlan.
 * Used to validate JSON code blocks before accepting them as plans.
 */
function isValidPlan(obj: unknown): obj is CardDesignPlan {
    if (!obj || typeof obj !== 'object') return false;
    const p = obj as Record<string, unknown>;
    return (
        typeof p.deck_name === 'string' &&
        Array.isArray(p.subtopics) &&
        p.subtopics.length > 0 &&
        typeof p.total_cards === 'number'
    );
}

/**
 * Extract a CardDesignPlan from the message stream. Two-pass strategy:
 *
 * Pass 1 (structured): Look for a `tool-invocation` part with
 *   toolName === 'propose_card_plan' (fired when the backend tool is
 *   properly registered and the model calls it as a function).
 *
 * Pass 2 (text fallback): Scan assistant message text for any ```json
 *   code block whose parsed shape matches CardDesignPlan. This catches
 *   models that output the JSON as text instead of a tool call.
 */
function extractPlanFromMessages(messages: UIMessage[]): CardDesignPlan | null {
    // Walk messages in reverse — most recent plan wins
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (!msg || msg.role !== 'assistant') continue;

        // ── Pass 1: structured tool-invocation part ──────────────────
        for (const part of msg.parts ?? []) {
            if (
                part.type === 'tool-invocation' &&
                (part as { toolName?: string }).toolName === 'propose_card_plan'
            ) {
                const args = (part as { args?: unknown }).args;
                if (isValidPlan(args)) return args;
            }
        }

        // ── Pass 2: JSON code block in text ──────────────────────────
        // UIMessage has no .content field — text lives in parts of type 'text'
        const textContent = (msg.parts ?? [])
            .filter((p) => p.type === 'text')
            .map((p) => (p as { text: string }).text)
            .join('');

        // Match any ```json ... ``` block (greedy-safe, handles multiline)
        const codeBlockRe = /```(?:json)?\s*([\s\S]*?)```/g;
        let match: RegExpExecArray | null;
        while ((match = codeBlockRe.exec(textContent)) !== null) {
            const segment = match[1];
            if (!segment) continue;
            try {
                const parsed = JSON.parse(segment) as Record<string, unknown>;

                // Direct plan shape: {deck_name, subtopics, total_cards, ...}
                if (isValidPlan(parsed)) return parsed;

                // Text-encoded tool call wrapper: {name, arguments: {...}}
                // The model emits this format when doing ReAct-style tool calls
                // as text rather than a proper function-calling API invocation.
                if (
                    (parsed.name === 'propose_card_plan' ||
                     (parsed as Record<string, unknown>).tool === 'propose_card_plan') &&
                    parsed.arguments &&
                    typeof parsed.arguments === 'object'
                ) {
                    const inner = parsed.arguments as Record<string, unknown>;
                    if (isValidPlan(inner)) return inner;
                }
            } catch {
                // not valid JSON or wrong shape — keep scanning
            }
        }
    }
    return null;
}

export function useCardDesignChat(sessionId: number | null): UseCardDesignChatReturn {
    const [proposedPlan, setProposedPlan] = useState<CardDesignPlan | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [historicalCount, setHistoricalCount] = useState(0);
    const lastExtractedRef = useRef<string>('');

    const transport = sessionId
        ? new DefaultChatTransport({
              api: `${API_BASE}/api/v1/chat/sessions/${sessionId}/stream`,
              headers: async (): Promise<Record<string, string>> => {
                  const token = await getAuthToken();
                  return token ? { Authorization: `Bearer ${token}` } : {};
              },
          })
        : new DefaultChatTransport({ api: `${API_BASE}/api/v1/chat/sessions/0/stream` });

    const { messages, status, sendMessage, setMessages } = useChat({
        transport,
        id: sessionId ? `design-${sessionId}` : 'design-placeholder',
    });

    // ── Pre-load message history ──────────────────────────────────────
    // useChat starts with empty messages; the LLM sees history via the
    // backend's chat_history context, but the UI shows nothing. Fetch
    // prior messages from REST and populate the hook state so the user
    // sees their prior conversation immediately.
    useEffect(() => {
        if (!sessionId) return;
        let cancelled = false;

        (async () => {
            try {
                const token = await getAuthToken();
                const res = await fetch(
                    `${API_BASE}/api/v1/chat/sessions/${sessionId}/messages?limit=100`,
                    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
                );
                if (!res.ok || cancelled) return;
                const rows: Array<{ id: number; role: string; content: string }> =
                    await res.json();

                // Map DB format → UIMessage (parts-based, chronological)
                // API returns ASC (oldest first) — do NOT reverse
                const historical = rows
                    .filter((r) => r.role === 'user' || r.role === 'assistant')
                    .map((r) => ({
                        id: String(r.id),
                        role: r.role as 'user' | 'assistant',
                        parts: [{ type: 'text' as const, text: r.content ?? '' }],
                    }));

                if (!cancelled && historical.length > 0) {
                    setMessages(historical as Parameters<typeof setMessages>[0]);
                    setHistoricalCount(historical.length);
                }
            } catch {
                // non-fatal — UI just starts empty
            }
        })();

        return () => { cancelled = true; };
    }, [sessionId]);  // eslint-disable-line react-hooks/exhaustive-deps

    // Watch messages for a newly proposed plan
    useEffect(() => {
        const plan = extractPlanFromMessages(messages);
        if (plan) {
            const key = JSON.stringify(plan);
            if (key !== lastExtractedRef.current) {
                lastExtractedRef.current = key;
                setProposedPlan(plan);
            }
        }
    }, [messages]);

    const attachSource = useCallback(
        (text: string) => {
            if (!text.trim()) return;
            sendMessage({
                text: `[SOURCE MATERIAL]\n\n${text.trim()}\n\n[/SOURCE MATERIAL]\n\nPlease use the above material to design my flashcard plan.`,
            });
        },
        [sendMessage],
    );

    const acceptPlan = useCallback(async () => {
        if (!proposedPlan) return null;
        setIsGenerating(true);
        try {
            const token = await getAuthToken();
            const res = await fetch(`${API_BASE}/api/v1/ai/design/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ plan: proposedPlan, session_id: sessionId }),
            });
            if (!res.ok) throw new Error(await res.text());
            return await res.json();
        } catch (err) {
            console.error('Card design generation failed:', err);
            return null;
        } finally {
            setIsGenerating(false);
        }
    }, [proposedPlan, sessionId]);

    const adjustPlan = useCallback((patch: Partial<CardDesignPlan>) => {
        setProposedPlan((prev) => (prev ? { ...prev, ...patch } : null));
    }, []);

    const resetPlan = useCallback(() => {
        setProposedPlan(null);
        lastExtractedRef.current = '';
    }, []);

    return {
        messages,
        status,
        proposedPlan,
        isGenerating,
        historicalCount,
        sendMessage,
        attachSource,
        acceptPlan,
        adjustPlan,
        resetPlan,
    };
}
