import { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getMessagesApiV1ChatSessionsSessionIdMessagesGet,
    sendMessageApiV1ChatSessionsSessionIdMessagesPost,
} from '@/api/generated';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useChatWebSocket } from '../hooks/useChatWebSocket';
import { useStreamingMessage } from '../hooks/useStreamingMessage';
import { toast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/queryKeys';
import { cn } from '@/lib/utils';
import type { ChatMessageResponse, ChatSessionResponse } from '@/api/generated';

/**
 * Enhanced ChatInterface
 * 
 * A unified chat component that fits into the NotebookLM-style layout.
 * Focuses on message display and input, delegating layout control to the parent pages.
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

export const ChatInterface = forwardRef<ChatInterfaceHandle, ChatInterfaceProps>(({
    sessionId,
    initialMessages = [],
    className,
    onMessageSent,
    emptyStateComponent,
}, ref) => {
    const queryClient = useQueryClient();
    const [isTyping, setIsTyping] = useState(false);

    // Fetch messages if not provided or to keep fresh
    const { data: messages = initialMessages, isLoading: messagesLoading } = useQuery({
        queryKey: queryKeys.chat.messages(sessionId),
        queryFn: () => getMessagesApiV1ChatSessionsSessionIdMessagesGet({ sessionId }),
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

    // WebSocket
    const ws = useChatWebSocket({
        sessionId,
        onMessage: (message) => {
            queryClient.setQueryData<ChatMessageResponse[]>(
                queryKeys.chat.messages(sessionId),
                (old = []) => [...old, message]
            );
            setIsTyping(false);
        },
        onChunk: streaming.handleChunk,
        onError: (error) => {
            toast({
                title: 'Connection Error',
                description: error,
                variant: 'destructive',
            });
            setIsTyping(false);
            streaming.reset();
        },
    });

    // Fallback REST Mutation
    const sendMutation = useMutation({
        mutationFn: (content: string) =>
            sendMessageApiV1ChatSessionsSessionIdMessagesPost({
                sessionId,
                requestBody: { content },
            }),
        onMutate: async (content) => {
            const userMessage: ChatMessageResponse = {
                id: Date.now(),
                session_id: sessionId,
                role: 'user',
                content,
                tokens: 0,
                model_used: null,
                created_at: new Date().toISOString(),
            };

            // Optimistic update
            queryClient.setQueryData<ChatMessageResponse[]>(
                queryKeys.chat.messages(sessionId),
                (old = []) => [...old, userMessage]
            );

            setIsTyping(true);
            return { userMessage };
        },
        onSuccess: (response) => {
            queryClient.setQueryData<ChatMessageResponse[]>(
                queryKeys.chat.messages(sessionId),
                (old = []) => [...old, response]
            );
            setIsTyping(false);
            onMessageSent?.();
        },
        onError: (error) => {
            toast({
                title: 'Failed to send',
                description: String(error),
                variant: 'destructive',
            });
            setIsTyping(false);
        },
    });

    const handleSendMessage = useCallback(
        (content: string) => {
            if (ws.isConnected) {
                // Optimistic UI for WS
                const userMessage: ChatMessageResponse = {
                    id: Date.now(),
                    session_id: sessionId,
                    role: 'user',
                    content,
                    tokens: 0,
                    model_used: null,
                    created_at: new Date().toISOString(),
                };

                queryClient.setQueryData<ChatMessageResponse[]>(
                    queryKeys.chat.messages(sessionId),
                    (old = []) => [...old, userMessage]
                );

                ws.sendMessage(content);
                streaming.startStreaming();
            } else {
                sendMutation.mutate(content);
            }
        },
        [ws, sessionId, queryClient, streaming, sendMutation]
    );

    useImperativeHandle(ref, () => ({
        sendMessage: handleSendMessage
    }));

    const isLoading = sendMutation.isPending || isTyping;

    const [variant, setVariant] = useState<'default' | 'centered'>('default');

    // Determine if we should show the centered layout
    const showCenteredInput = messages.length === 0 && !isTyping && !messagesLoading;

    return (
        <div className={cn('flex flex-col h-full overflow-hidden relative', className)}>
            {/* Messages Area OR Centered Input Container */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
                <MessageList
                    messages={messages}
                    streamingContent={streaming.content}
                    isStreaming={streaming.isStreaming}
                    isLoading={messagesLoading}
                    isTyping={isTyping && !streaming.isStreaming}
                    className="flex-1 px-4 md:px-8 py-6"
                    // Hide empty state if we are doing the centered input trick, as the input ITSELF is the empty state
                    emptyState={showCenteredInput ? <div /> : emptyStateComponent}
                />

                {/* CENTERED INPUT MODE (DeepSeek Style) */}
                {showCenteredInput && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 z-20 pointer-events-none">
                        <div className="w-full max-w-2xl pointer-events-auto space-y-8">
                            {/* Brand / Greeting */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center space-y-6"
                            >
                                <div className="relative w-16 h-16 mx-auto">
                                    <div className="absolute inset-0 rounded-full bg-[var(--synapse-cyan)]/20 blur-xl animate-pulse" />
                                    <div className="relative bg-black/40 border border-white/10 p-3.5 rounded-2xl shadow-2xl backdrop-blur-sm">
                                        {/* Minimal Brand Icon */}
                                        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-[var(--synapse-cyan)]" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                </div>
                                <h2 className="text-2xl font-semibold text-white tracking-tight">
                                    How can I help you learn?
                                </h2>
                            </motion.div>

                            {/* The Main Input */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1 }}
                            >
                                <MessageInput
                                    onSend={handleSendMessage}
                                    disabled={!ws.isConnected && false}
                                    isLoading={isLoading || streaming.isStreaming}
                                    className="shadow-2xl border-white/10"
                                    placeholder="Ask anything about your documents..."
                                />
                            </motion.div>
                        </div>
                    </div>
                )}
            </div>

            {/* BOTTOM INPUT AREA (Standard Mode) */}
            {/* Only show if NOT in centered mode */}
            {/* BOTTOM INPUT AREA (Standard Mode) */}
            {/* Only show if NOT in centered mode */}
            {!showCenteredInput && (
                <div className="flex-none p-4 md:p-6 pb-8 border-t border-white/5 bg-[#020202]/80 backdrop-blur-xl z-20 relative">
                    <div className="max-w-4xl mx-auto w-full relative">
                        <MessageInput
                            onSend={handleSendMessage}
                            disabled={!ws.isConnected && false}
                            isLoading={isLoading || streaming.isStreaming}
                            className="shadow-[var(--synapse-shadow-lg)]"
                            placeholder="Ask anything about your documents..."
                        />

                        {/* Connection Status Indicator */}
                        <div className="absolute -bottom-6 right-2 flex items-center gap-1.5 opacity-40 text-[10px] uppercase tracking-widest text-[var(--synapse-text-tertiary)] hover:opacity-100 transition-opacity">
                            <div className={cn("w-1.5 h-1.5 rounded-full transition-colors", ws.isConnected ? "bg-[var(--synapse-cyan)] shadow-[0_0_5px_var(--synapse-cyan)]" : "bg-red-500 shadow-[0_0_5px_red]")} />
                            {ws.isConnected ? "Synced to Neural Core" : "Reconnecting Neural Link..."}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default ChatInterface;
