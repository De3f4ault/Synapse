/**
 * useTitleGeneration - Centralized title generation
 * 
 * Single source of truth for generating chat session titles.
 * Used by both Dashboard Assistant and Chat Page.
 * 
 * Location: frontend/src/modules/chat/hooks/useTitleGeneration.ts
 */

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { ChatService } from "@/api/generated";

const TITLE_GENERATION_PROMPT = `Generate a concise 3-5 word title for this question: "%MESSAGE%"

Rules:
- Be specific and descriptive
- Remove filler words (help me, can you, etc.)
- Focus on the main topic
- Use title case

Examples:
"Create 10 flashcards on Linux CFS" → "Linux CFS Flashcards"
"What are my weak areas?" → "Weak Areas Review"
"Explain how photosynthesis works" → "Photosynthesis Explanation"

Title:`;

/**
 * Hook for generating and updating session titles
 */
export const useTitleGeneration = () => {
    const queryClient = useQueryClient();
    const token = useAuthStore((state) => state.token);

    /**
     * Generate a title from the first message content
     */
    const generateTitle = useCallback(
        async (firstMessage: string): Promise<string> => {
            if (!token) {
                // Fallback: use first 5 words
                const words = firstMessage.split(" ").slice(0, 5);
                return words.join(" ") + (firstMessage.split(" ").length > 5 ? "..." : "");
            }

            try {
                const response = await fetch("/api/v1/chat/sessions/dashboard/message", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        content: TITLE_GENERATION_PROMPT.replace("%MESSAGE%", firstMessage),
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    let title = data.content?.trim().replace(/^["']|["']$/g, ""); // Remove quotes

                    // Fallback if response is too long or empty
                    if (!title || title.length > 60) {
                        const words = firstMessage.split(" ").slice(0, 5);
                        title = words.join(" ") + (firstMessage.split(" ").length > 5 ? "..." : "");
                    }

                    return title;
                }
            } catch (error) {
                console.error("Failed to generate title:", error);
            }

            // Fallback: use first 5 words
            const words = firstMessage.split(" ").slice(0, 5);
            return words.join(" ") + (firstMessage.split(" ").length > 5 ? "..." : "");
        },
        [token],
    );

    /**
     * Update session title via API
     */
    const updateSessionTitle = useCallback(
        async (sessionId: number, title: string): Promise<void> => {
            try {
                await ChatService.updateSessionApiV1ChatSessionsSessionIdPatch(sessionId, {
                    title,
                });

                // Invalidate sessions to refresh UI
                queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
                queryClient.invalidateQueries({ queryKey: ["chat-session", sessionId] });
            } catch (error) {
                console.error("Failed to update session title:", error);
            }
        },
        [queryClient],
    );

    /**
     * Generate title and update session in one call
     */
    const generateAndUpdateTitle = useCallback(
        async (sessionId: number, firstMessage: string): Promise<void> => {
            const title = await generateTitle(firstMessage);
            await updateSessionTitle(sessionId, title);
        },
        [generateTitle, updateSessionTitle],
    );

    return {
        generateTitle,
        updateSessionTitle,
        generateAndUpdateTitle,
    };
};

export default useTitleGeneration;
