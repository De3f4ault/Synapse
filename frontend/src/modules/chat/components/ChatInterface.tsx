import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getMessagesApiV1ChatSessionsSessionIdMessagesGet,
    sendMessageApiV1ChatSessionsSessionIdMessagesPost,
} from '@/api/generated';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ContextPanel } from './ContextPanel';
import { useChatWebSocket } from '../hooks/useChatWebSocket';
import { useStreamingMessage } from '../hooks/useStreamingMessage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/queryKeys';
import { cn } from '@/lib/utils';
import { PanelRightOpen, PanelRightClose, Wifi, WifiOff, Sparkles } from 'lucide-react';
import type { ChatMessageResponse, ChatSessionResponse, DocumentResponse } from '@/api/generated';

/**
 * Enhanced ChatInterface Component
 *
 * Improvements per documentation:
 * - Enhanced streaming UI with better indicators
 * - Smooth animations for panel transitions
 * - Better connection status display
 * - Improved message handling with optimistic updates
 * - Enhanced context panel integration
 * - Better error handling and user feedback
 */

interface ChatInterfaceProps {
    session: ChatSessionResponse;
    document?: DocumentResponse | null;
    userName?: string;
    useWebSocket?: boolean;
    className?: string;
}

export function ChatInterface({
    session,
    document,
    userName,
    useWebSocket = true,
    className,
}: ChatInterfaceProps) {
    const queryClient = useQueryClient();
    const [showContext, setShowContext] = useState(!!document);
    const [isTyping, setIsTyping] = useState(false);

    // Fetch existing messages
    const { data: messages = [], isLoading: messagesLoading } = useQuery({
        queryKey: queryKeys.chat.messages(session.id.toString()),
                                                                         queryFn: () =>
                                                                         getMessagesApiV1ChatSessionsSessionIdMessagesGet({ sessionId: session.id }),
    });

    // Streaming message state
    const streaming = useStreamingMessage({
        onComplete: () => {
            // Refetch messages when streaming completes to get the persisted message
            queryClient.invalidateQueries({
                queryKey: queryKeys.chat.messages(session.id.toString()),
            });
        },
    });

    // WebSocket connection (for streaming)
    const ws = useChatWebSocket({
        sessionId: session.id,
        onMessage: (message) => {
            queryClient.setQueryData<ChatMessageResponse[]>(
                queryKeys.chat.messages(session.id.toString()),
                                                            (old = []) => [...old, message]
            );
            setIsTyping(false);
        },
        onChunk: streaming.handleChunk,
        onError: (error) => {
            toast({
                title: 'Chat Error',
                description: error,
                variant: 'destructive',
            });
            setIsTyping(false);
            streaming.reset();
        },
    });

    // Non-streaming mutation (fallback)
    const sendMutation = useMutation({
        mutationFn: (content: string) =>
        sendMessageApiV1ChatSessionsSessionIdMessagesPost({
            sessionId: session.id,
            requestBody: { content },
        }),
        onMutate: async (content) => {
            // Optimistically add user message
            const userMessage: ChatMessageResponse = {
                id: Date.now(),
                                     session_id: session.id,
                                     role: 'user',
                                     content,
                                     tokens: 0,
                                     model_used: null,
                                     created_at: new Date().toISOString(),
            };

            queryClient.setQueryData<ChatMessageResponse[]>(
                queryKeys.chat.messages(session.id.toString()),
                                                            (old = []) => [...old, userMessage]
            );

            setIsTyping(true);
            return { userMessage };
        },
        onSuccess: (response) => {
            // Add AI response
            queryClient.setQueryData<ChatMessageResponse[]>(
                queryKeys.chat.messages(session.id.toString()),
                                                            (old = []) => [...old, response]
            );
            setIsTyping(false);
        },
        onError: (error) => {
            toast({
                title: 'Failed to send message',
                description: String(error),
                  variant: 'destructive',
            });
            setIsTyping(false);
        },
    });

    const handleSendMessage = useCallback(
        (content: string) => {
            if (useWebSocket && ws.isConnected) {
                // Add user message optimistically
                const userMessage: ChatMessageResponse = {
                    id: Date.now(),
                                          session_id: session.id,
                                          role: 'user',
                                          content,
                                          tokens: 0,
                                          model_used: null,
                                          created_at: new Date().toISOString(),
                };

                queryClient.setQueryData<ChatMessageResponse[]>(
                    queryKeys.chat.messages(session.id.toString()),
                                                                (old = []) => [...old, userMessage]
                );

                ws.sendMessage(content);
                streaming.startStreaming();
            } else {
                // Use REST API
                sendMutation.mutate(content);
            }
        },
        [useWebSocket, ws, session.id, queryClient, streaming, sendMutation]
    );

    const isLoading = sendMutation.isPending || isTyping;

    return (
        <div className={cn('flex h-full', className)}>
        {/* Main chat area */}
        <motion.div
        className="flex flex-1 flex-col"
        layout
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
        {/* Header with animations */}
        <motion.div
        className="flex items-center justify-between border-b px-4 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        >
        <div>
        <h2 className="font-semibold flex items-center gap-2">
        {session.title}
        {document && (
            <Badge variant="secondary" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            Context-Aware
            </Badge>
        )}
        </h2>
        <p className="text-xs text-muted-foreground">
        {session.message_count} messages
        </p>
        </div>
        <div className="flex items-center gap-2">
        {/* Enhanced connection status */}
        {useWebSocket && (
            <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            >
            <Badge
            variant={ws.isConnected ? 'default' : 'secondary'}
            className={cn(
                'gap-1 transition-colors',
                ws.isConnected && 'bg-green-600 hover:bg-green-700'
            )}
            >
            {ws.isConnected ? (
                <>
                <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
                >
                <Wifi className="h-3 w-3" />
                </motion.div>
                Live
                </>
            ) : (
                <>
                <WifiOff className="h-3 w-3" />
                Offline
                </>
            )}
            </Badge>
            </motion.div>
        )}
        {/* Toggle context panel with animation */}
        <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        >
        <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowContext(!showContext)}
        >
        <motion.div
        animate={{ rotate: showContext ? 180 : 0 }}
        transition={{ duration: 0.3 }}
        >
        {showContext ? (
            <PanelRightClose className="h-5 w-5" />
        ) : (
            <PanelRightOpen className="h-5 w-5" />
        )}
        </motion.div>
        </Button>
        </motion.div>
        </div>
        </motion.div>

        {/* Messages with fade-in animation */}
        <MessageList
        messages={messages}
        streamingContent={streaming.content}
        isStreaming={streaming.isStreaming}
        isLoading={messagesLoading}
        isTyping={isTyping && !streaming.isStreaming}
        userName={userName}
        className="flex-1"
        />

        {/* Input */}
        <MessageInput
        onSend={handleSendMessage}
        disabled={!ws.isConnected && useWebSocket}
        isLoading={isLoading || streaming.isStreaming}
        />
        </motion.div>

        {/* Context panel with slide animation */}
        <AnimatePresence mode="wait">
        {showContext && (
            <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
            >
            <ContextPanel
            document={document}
            isOpen={showContext}
            onClose={() => setShowContext(false)}
            className="border-l h-full"
            />
            </motion.div>
        )}
        </AnimatePresence>
        </div>
    );
}

export default ChatInterface;
