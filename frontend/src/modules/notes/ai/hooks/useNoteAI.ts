/**
 * Notes Module - useNoteAI Hook
 * AI-powered note intelligence with session management.
 *
 * MIGRATED FROM: services/noteAI.service.ts (class → hook conversion)
 * PATTERN: Session resets when active note changes.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { ChatService } from "@/api/generated";
import { toast } from "sonner";
import { onNoteChange, type AIAction } from "../../core";

// ============================================================================
// Types
// ============================================================================

export interface AIInsight {
    type: "summary" | "tags" | "expansion" | "suggestions";
    title: string;
    content: string | string[];
    timestamp: Date;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for AI-powered note intelligence.
 *
 * Features:
 * - Summarization
 * - Tag generation
 * - Content expansion
 * - Grammar correction
 * - Session reset on note change
 */
export function useNoteAI() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentAction, setCurrentAction] = useState<AIAction | null>(null);
    const [insights, setInsights] = useState<AIInsight[]>([]);
    const sessionIdRef = useRef<number | null>(null);

    // Reset session when note changes (session boundary enforcement)
    useEffect(() => {
        const unsubscribe = onNoteChange(() => {
            sessionIdRef.current = null;
            setInsights([]);
        });
        return unsubscribe;
    }, []);

    // Ensure we have an AI session
    const ensureSession = useCallback(async (): Promise<number> => {
        if (sessionIdRef.current) return sessionIdRef.current;

        try {
            const session = await ChatService.createSessionApiV1ChatSessionsPost({
                title: "Note AI Assistant",
            });
            sessionIdRef.current = session.id;
            return session.id;
        } catch (error) {
            console.error("Failed to create AI session:", error);
            throw new Error("Could not initialize AI assistant");
        }
    }, []);

    // Send prompt to AI
    const sendPrompt = useCallback(async (prompt: string): Promise<string> => {
        const sessionId = await ensureSession();
        const response = await ChatService.sendMessageApiV1ChatSessionsSessionIdMessagesPost(
            sessionId,
            {
                session_id: sessionId,
                content: prompt,
            } as any
        );
        return response.content;
    }, [ensureSession]);

    // Add insight to list
    const addInsight = useCallback((insight: AIInsight) => {
        setInsights((prev) => [insight, ...prev]);
    }, []);

    // Summarize content
    const summarize = useCallback(async (content: string): Promise<string> => {
        if (!content.trim()) {
            throw new Error("Cannot summarize empty content");
        }

        setIsProcessing(true);
        setCurrentAction("summarize");

        try {
            const prompt = `You are a neural synthesis engine. Generate a concise, insightful summary of the following content.
Focus on key concepts, main ideas, and important takeaways. Use a technical, analytical tone.

Content to summarize:
${content}

Provide ONLY the summary in markdown format, no preamble. Keep it under 200 words.`;

            const result = await sendPrompt(prompt);

            addInsight({
                type: "summary",
                title: "Neural Synthesis",
                content: result,
                timestamp: new Date(),
            });

            return result;
        } catch (error) {
            toast.error("Failed to generate summary");
            throw error;
        } finally {
            setIsProcessing(false);
            setCurrentAction(null);
        }
    }, [sendPrompt, addInsight]);

    // Generate tags
    const generateTags = useCallback(async (title: string, content: string): Promise<string[]> => {
        if (!content.trim() && !title.trim()) {
            throw new Error("Cannot generate tags from empty content");
        }

        setIsProcessing(true);
        setCurrentAction("tags");

        try {
            const prompt = `Analyze this note and generate 3-7 relevant tags.
Tags should be: lowercase, single words or short phrases (2-3 words max), relevant to main topics.

Title: ${title}
Content: ${content}

Respond with ONLY a comma-separated list of tags. Example: "ai, machine learning, python"`;

            const response = await sendPrompt(prompt);

            const tags = response
                .split(",")
                .map((tag) => tag.trim().toLowerCase())
                .filter((tag) => tag.length > 0 && tag.length < 30)
                .slice(0, 7);

            addInsight({
                type: "tags",
                title: "Suggested Tags",
                content: tags,
                timestamp: new Date(),
            });

            return tags;
        } catch (error) {
            toast.error("Failed to generate tags");
            throw error;
        } finally {
            setIsProcessing(false);
            setCurrentAction(null);
        }
    }, [sendPrompt, addInsight]);

    // Expand content
    const expandContent = useCallback(async (selection: string, context: string): Promise<string> => {
        if (!selection.trim()) {
            throw new Error("Cannot expand empty selection");
        }

        setIsProcessing(true);
        setCurrentAction("expand");

        try {
            const prompt = `Expand on this selected text with additional details, explanations, and examples.
Maintain the same writing style.

Selected text: "${selection}"

Context: ${context.substring(0, 500)}

Provide ONLY the expanded content in markdown, no preamble.`;

            const result = await sendPrompt(prompt);

            addInsight({
                type: "expansion",
                title: "Content Expansion",
                content: result,
                timestamp: new Date(),
            });

            return result;
        } catch (error) {
            toast.error("Failed to expand content");
            throw error;
        } finally {
            setIsProcessing(false);
            setCurrentAction(null);
        }
    }, [sendPrompt, addInsight]);

    // Correct grammar
    const correctGrammar = useCallback(async (content: string): Promise<string> => {
        if (!content.trim()) {
            throw new Error("Cannot correct empty content");
        }

        setIsProcessing(true);
        setCurrentAction("correct");

        try {
            const prompt = `Fix grammar, spelling, and improve clarity in this text. Preserve markdown formatting and original meaning.

Text:
${content}

Provide ONLY the corrected version, no explanation.`;

            return await sendPrompt(prompt);
        } catch (error) {
            toast.error("Failed to correct grammar");
            throw error;
        } finally {
            setIsProcessing(false);
            setCurrentAction(null);
        }
    }, [sendPrompt]);

    // Reset session (manual)
    const resetSession = useCallback(() => {
        sessionIdRef.current = null;
        setInsights([]);
    }, []);

    // Clear insights
    const clearInsights = useCallback(() => {
        setInsights([]);
    }, []);

    return {
        // State
        isProcessing,
        currentAction,
        insights,

        // Actions
        summarize,
        generateTags,
        expandContent,
        correctGrammar,
        resetSession,
        clearInsights,
    };
}
