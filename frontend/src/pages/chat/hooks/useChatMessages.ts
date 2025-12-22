/**
 * useChatMessages - Message fetching/sending
 * Manages message operations and optimistic updates
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChatService } from "@/api/generated";
import type { ChatMessageResponse } from "@/api/generated";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";

/**
 * Hook to fetch messages from a session
 */
export const useChatMessages = (
  sessionId: number | undefined,
  limit?: number,
) => {
  return useQuery<ChatMessageResponse[]>({
    queryKey: ["chat-messages", sessionId, limit],
    queryFn: () =>
      ChatService.getMessagesApiV1ChatSessionsSessionIdMessagesGet(
        sessionId!,
        limit,
      ),
    enabled: !!sessionId,
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to send a message (non-streaming)
 * Use this for fallback or when WebSocket is unavailable
 */
export const useSendMessage = (sessionId: number | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) =>
      ChatService.sendMessageApiV1ChatSessionsSessionIdMessagesPost(
        sessionId!,
        {
          content,
        },
      ),
    onMutate: async (content) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["chat-messages", sessionId],
      });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData<ChatMessageResponse[]>([
        "chat-messages",
        sessionId,
      ]);

      // Optimistically add user message
      if (previousMessages) {
        queryClient.setQueryData<ChatMessageResponse[]>(
          ["chat-messages", sessionId],
          [
            ...previousMessages,
            {
              id: Date.now(),
              session_id: sessionId!,
              role: "user",
              content,
              tokens: 0,
              model_used: null,
              created_at: new Date().toISOString(),
            } as ChatMessageResponse,
          ],
        );
      }

      return { previousMessages };
    },
    onError: (error: any, _, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["chat-messages", sessionId],
          context.previousMessages,
        );
      }
      toast.error(error.message || "Failed to send message");
    },
    onSuccess: async (_response, content) => {
      // Invalidate to refetch from server
      queryClient.invalidateQueries({ queryKey: ["chat-messages", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["chat-session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });

      // Generate title if this is first user message
      try {
        const messages = queryClient.getQueryData<ChatMessageResponse[]>([
          "chat-messages",
          sessionId,
        ]);
        const userMessagesCount =
          messages?.filter((m) => m.role === "user").length || 0;

        if (userMessagesCount === 1 && sessionId) {
          // This is the first user message - generate title
          const token = useAuthStore.getState().token;

          if (token) {
            try {
              // Generate title using AI
              const titleResponse = await fetch(
                "/api/v1/chat/sessions/dashboard/message",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    content: `Generate a concise 3-5 word title for this question: "${content}"

Rules:
- Be specific and descriptive
- Remove filler words (help me, can you, etc.)
- Focus on the main topic
- Use title case

Examples:
"Create 10 flashcards on Linux CFS" → "Linux CFS Flashcards"
"What are my weak areas?" → "Weak Areas Review"
"Explain how photosynthesis works" → "Photosynthesis Explanation"

Title:`,
                  }),
                },
              );

              if (titleResponse.ok) {
                const data = await titleResponse.json();
                let title = data.content?.trim().replace(/^["']|["']$/g, ""); // Remove quotes

                // Fallback if response is too long or empty
                if (!title || title.length > 60) {
                  const words = content.split(" ").slice(0, 5);
                  title =
                    words.join(" ") +
                    (content.split(" ").length > 5 ? "..." : "");
                }

                // Update session title
                await fetch(`/api/v1/chat/sessions/${sessionId}`, {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ title }),
                });

                // Invalidate sessions to refresh sidebar
                queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
                queryClient.invalidateQueries({
                  queryKey: ["chat-session", sessionId],
                });
              }
            } catch (error) {
              console.error("Failed to generate/update title:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error in title generation:", error);
      }
    },
  });
};

/**
 * Hook to add a message to local cache (for WebSocket streaming)
 */
export const useAddMessage = (sessionId: number | undefined) => {
  const queryClient = useQueryClient();

  return (message: ChatMessageResponse) => {
    queryClient.setQueryData<ChatMessageResponse[]>(
      ["chat-messages", sessionId],
      (old) => (old ? [...old, message] : [message]),
    );
  };
};

/**
 * Hook to update a message in local cache (for streaming updates)
 */
export const useUpdateMessage = (sessionId: number | undefined) => {
  const queryClient = useQueryClient();

  return (messageId: number, updates: Partial<ChatMessageResponse>) => {
    queryClient.setQueryData<ChatMessageResponse[]>(
      ["chat-messages", sessionId],
      (old) =>
        old?.map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg,
        ) || [],
    );
  };
};
