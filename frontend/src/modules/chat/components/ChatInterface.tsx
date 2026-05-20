import { useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChatService } from "@/api/generated";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ThinkingPanel, type ThinkingLayout } from "./ThinkingPanel";
import { useChatWebSocket } from "../hooks/useChatWebSocket";
import { useStreamingMessage } from "../hooks/useStreamingMessage";
import { toast } from "@/hooks/use-toast";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import type { ChatMessageResponse } from "@/api/generated";

/**
 * Enhanced ChatInterface
 *
 * A unified chat component that fits into the NotebookLM-style layout.
 * Mode selection is now integrated into the MessageInput component.
 */

interface ChatInterfaceProps {
  sessionId: number;
  initialMessages?: ChatMessageResponse[];
  className?: string;
  onMessageSent?: () => void;
  emptyStateComponent?: React.ReactNode;
}

export interface ChatInterfaceHandle {
  sendMessage: (content: string) => void;
}

export const ChatInterface = forwardRef<
  ChatInterfaceHandle,
  ChatInterfaceProps
>(
  (
    {
      sessionId,
      initialMessages = [],
      className,
      onMessageSent,
      emptyStateComponent,
    },
    ref,
  ) => {
    const queryClient = useQueryClient();
    const [isTyping, setIsTyping] = useState(false);
    const [currentMode, setCurrentMode] = useState(() => 
      localStorage.getItem("synapse-chat-mode") || "tutor"
    );
    const [thinkingLayout, setThinkingLayout] = useState<ThinkingLayout>('collapsed');
    const [routingInfo, setRoutingInfo] = useState<{ model: string; agent: string } | null>(null);

    // Fetch messages if not provided or to keep fresh
    const { data: messages = initialMessages, isLoading: messagesLoading } =
      useQuery({
        queryKey: queryKeys.chat.messages(sessionId),
        queryFn: () =>
          ChatService.getMessagesApiV1ChatSessionsSessionIdMessagesGet(
            sessionId,
          ),
        enabled: !!sessionId,
        initialData: initialMessages.length > 0 ? initialMessages : undefined,
      });

    // Streaming state
    const streaming = useStreamingMessage({
      onComplete: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.chat.messages(sessionId),
        });
      },
    });

    // WebSocket with mode support
    const ws = useChatWebSocket({
      sessionId,
      onMessage: (message) => {
        queryClient.setQueryData<ChatMessageResponse[]>(
          queryKeys.chat.messages(sessionId),
          (old = []) => [...old, message],
        );
        setIsTyping(false);
      },
      onChunk: streaming.handleChunk,
      onThinking: () => {
        // Thinking is handled by streaming.handleChunk with type='thinking'
      },
      onRouting: (metadata) => {
        // Update thinking layout based on mode
        setThinkingLayout(metadata.thinkingUi as ThinkingLayout);
        setRoutingInfo({ model: metadata.model, agent: metadata.agent });
      },
      onError: (error) => {
        // Suppress auth errors as they can happen during reconnects
        if (
          error &&
          !error.includes("authentication") &&
          !error.includes("auth")
        ) {
          toast({
            title: "Connection Error",
            description: error,
            variant: "destructive",
          });
        }
        setIsTyping(false);
        streaming.reset();
      },
    });

    // Fallback REST Mutation
    const sendMutation = useMutation({
      mutationFn: (content: string) =>
        ChatService.sendMessageApiV1ChatSessionsSessionIdMessagesPost(
          sessionId,
          { session_id: sessionId, content },
        ),
      onMutate: async (content) => {
        const userMessage: ChatMessageResponse = {
          id: Date.now(),
          session_id: sessionId,
          role: "user",
          content,
          tokens: 0,
          model_used: null,
          created_at: new Date().toISOString(),
        };

        // Optimistic update
        queryClient.setQueryData<ChatMessageResponse[]>(
          queryKeys.chat.messages(sessionId),
          (old = []) => [...old, userMessage],
        );

        setIsTyping(true);
        return { userMessage };
      },
      onSuccess: (response) => {
        queryClient.setQueryData<ChatMessageResponse[]>(
          queryKeys.chat.messages(sessionId),
          (old = []) => [...old, response],
        );
        setIsTyping(false);
        onMessageSent?.();
      },
      onError: (error) => {
        toast({
          title: "Failed to send",
          description: String(error),
          variant: "destructive",
        });
        setIsTyping(false);
      },
    });

    const handleSendMessage = useCallback(
      (content: string, options?: { mode: string; enableSearch?: boolean }) => {
        const modeToUse = options?.mode || currentMode;
        
        if (ws.isConnected) {
          // Optimistic UI for WS
          const userMessage: ChatMessageResponse = {
            id: Date.now(),
            session_id: sessionId,
            role: "user",
            content,
            tokens: 0,
            model_used: null,
            created_at: new Date().toISOString(),
          };

          queryClient.setQueryData<ChatMessageResponse[]>(
            queryKeys.chat.messages(sessionId),
            (old = []) => [...old, userMessage],
          );

          // Send with mode
          ws.sendMessage(content, { modeId: modeToUse });
          streaming.startStreaming();
          
          // Update thinking layout based on mode
          if (modeToUse === 'deep_think') {
            setThinkingLayout('panel');
          } else if (modeToUse === 'tutor') {
            setThinkingLayout('collapsed');
          } else {
            setThinkingLayout('off');
          }
        } else {
          sendMutation.mutate(content);
        }
      },
      [ws, sessionId, queryClient, streaming, sendMutation, currentMode],
    );

    const handleModeChange = useCallback((mode: string) => {
      setCurrentMode(mode);
      localStorage.setItem("synapse-chat-mode", mode);
    }, []);

    useImperativeHandle(ref, () => ({
      sendMessage: (content: string) => handleSendMessage(content),
    }));

    const isLoading = sendMutation.isPending || isTyping;

    // Determine if we should show the centered layout
    const showCenteredInput =
      messages.length === 0 && !isTyping && !messagesLoading;

    return (
      <div
        className={cn(
          "flex flex-col h-full overflow-hidden relative",
          className,
        )}
      >
        {/* Messages Area OR Centered Input Container */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {/* Thinking Panel (when streaming with thinking) */}
          {streaming.isStreaming && streaming.thinkingContent && thinkingLayout !== 'off' && (
            <ThinkingPanel
              content={streaming.thinkingContent}
              isStreaming={streaming.isStreaming}
              layout={thinkingLayout}
              modelName={routingInfo?.model}
            />
          )}

          <MessageList
            messages={messages}
            streamingContent={streaming.content}
            isStreaming={streaming.isStreaming}
            isLoading={messagesLoading}
            isTyping={isTyping && !streaming.isStreaming}
            className="flex-1 px-4 md:px-8 py-6"
            // Hide empty state if we are doing the centered input trick
            emptyState={showCenteredInput ? <div /> : emptyStateComponent}
          />

          {/* CENTERED INPUT MODE (Empty State) */}
          {showCenteredInput && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 z-20 pointer-events-none">
              <div className="w-full max-w-2xl pointer-events-auto space-y-6">
                {/* Brand / Greeting */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-4"
                >
                  <div className="relative w-14 h-14 mx-auto">
                    <div className="absolute inset-0 bg-[var(--synapse-cyan)]/20 blur-xl rounded-full" />
                    <div className="relative bg-background/80 border border-border p-3 rounded-2xl backdrop-blur-sm">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="w-full h-full text-[var(--synapse-cyan)]"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground">
                    How can I help you learn?
                  </h2>
                  <p className="text-sm text-foreground/50 max-w-md mx-auto">
                    Ask questions, analyze documents, create quizzes, or explore complex topics
                  </p>
                </motion.div>

                {/* The Main Input */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 }}
                >
                  <MessageInput
                    onSend={handleSendMessage}
                    disabled={!ws.isConnected && false}
                    isLoading={isLoading || streaming.isStreaming}
                    className="shadow-2xl"
                    placeholder="Ask anything..."
                    initialMode={currentMode}
                    onModeChange={handleModeChange}
                  />
                </motion.div>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM INPUT AREA */}
        {!showCenteredInput && (
          <div className="flex-none p-4 border-t border-border bg-card/90 backdrop-blur-md z-50 relative">
            <div className="max-w-3xl mx-auto w-full">
              <MessageInput
                onSend={handleSendMessage}
                disabled={!ws.isConnected && false}
                isLoading={isLoading || streaming.isStreaming}
                placeholder="Message Synapse..."
                initialMode={currentMode}
                onModeChange={handleModeChange}
              />
            </div>
          </div>
        )}
      </div>
    );
  },
);

export default ChatInterface;
