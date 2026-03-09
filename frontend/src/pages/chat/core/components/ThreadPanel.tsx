/**
 * ThreadPanel - Grok-style slide-out thread panel
 *
 * INVARIANT: Threads do NOT show branch controls
 * Main chat does NOT show thread messages.
 *
 * UX: Right-side slide-out panel for topic isolation.
 * Users can:
 * - View list of threads for current session
 * - Create new thread
 * - Switch between threads
 * - Send messages within a thread
 * - Return to main conversation
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, MessageSquarePlus, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useThreadStore, useCurrentThreadId } from '../state/threadStore';
import { ThreadListItem } from './ThreadListItem';
import { ChatMessage } from './ChatMessage';
import { ChatInputBox } from './ChatInputBox';
import { useThreads, useCreateThread, useThreadMessages } from '../hooks/useThreads';
import { getWebSocketManager } from '@/api/websocket/manager';

import type { ChatMessageResponse } from '@/api/generated';

interface ThreadPanelProps {
    sessionId: number;
    panelWidth: number;
    onResize: (width: number) => void;
}

export function ThreadPanel({ sessionId, panelWidth, onResize }: ThreadPanelProps) {
    const {
        isPanelOpen,
        closePanel,
        context,
        threads,
        setThreads,
        setLoadingThreads,
        switchToMain,
        switchToThread,
        addThread,
    } = useThreadStore();

    const currentThreadId = useCurrentThreadId();

    // Fetch threads for session
    const { data: threadsData, isLoading } = useThreads(sessionId);
    const createThread = useCreateThread();

    // Sync threads to store
    useEffect(() => {
        if (threadsData?.threads) {
            setThreads(threadsData.threads);
        }
        setLoadingThreads(isLoading);
    }, [threadsData, isLoading, setThreads, setLoadingThreads]);

    // Create new thread
    const handleCreateThread = async () => {
        try {
            const newThread = await createThread.mutateAsync({
                sessionId,
                title: undefined,
            });
            addThread(newThread);
            switchToThread(newThread.id, newThread);
        } catch (error) {
            console.error('Failed to create thread:', error);
        }
    };

    const handleThreadClick = (thread: typeof threads[0]) => {
        switchToThread(thread.id, thread);
    };

    // Resize handle logic
    const isDragging = useRef(false);
    const startX = useRef(0);
    const startWidth = useRef(0);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        startX.current = e.clientX;
        startWidth.current = panelWidth;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const handleMouseMove = (ev: MouseEvent) => {
            if (!isDragging.current) return;
            // Dragging LEFT = larger panel (resize handle is on the left edge)
            const delta = startX.current - ev.clientX;
            const newWidth = Math.min(Math.max(startWidth.current + delta, 300), 700);
            onResize(newWidth);
        };

        const handleMouseUp = () => {
            isDragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [panelWidth, onResize]);

    const isInThread = context.mode === 'thread';

    return (
        <AnimatePresence>
            {isPanelOpen && (
                <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: panelWidth, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                    className="h-full flex-shrink-0 overflow-hidden relative"
                >
                    {/* Resize handle */}
                    <div
                        onMouseDown={handleMouseDown}
                        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10
                                   hover:bg-cyan-500/30 active:bg-cyan-500/50 transition-colors
                                   group"
                    >
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full
                                        bg-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <div className="h-full flex flex-col bg-[#0a0a0e] border-l border-white/[0.06]" style={{ width: panelWidth }}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06]">
                            <div className="flex items-center gap-2">
                                <MessageSquarePlus className="size-3.5 text-cyan-400" />
                                <h2 className="font-medium text-[13px] text-zinc-200">
                                    {isInThread && context.thread?.title
                                        ? context.thread.title
                                        : 'Threads'}
                                </h2>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    closePanel();
                                }}
                                className="size-7 flex items-center justify-center rounded-full text-zinc-500 hover:text-white hover:bg-white/10 transition-colors relative z-20"
                                aria-label="Close thread panel"
                            >
                                <X className="size-3.5" />
                            </button>
                        </div>

                        {/* Back to threads list */}
                        {isInThread && (
                            <div className="px-3 py-1.5 border-b border-white/[0.04]">
                                <button
                                    onClick={switchToMain}
                                    className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                                >
                                    <ArrowLeft className="size-3" />
                                    Back to threads list
                                </button>
                            </div>
                        )}

                        {/* Content: Thread conversation or thread list */}
                        {isInThread && currentThreadId ? (
                            <ThreadConversation threadId={currentThreadId} />
                        ) : (
                            <>
                                {/* New Thread button — compact */}
                                <div className="px-2 py-2 border-b border-white/[0.04]">
                                    <Button
                                        onClick={handleCreateThread}
                                        disabled={createThread.isPending}
                                        className="w-full gap-1.5 bg-cyan-600/80 hover:bg-cyan-500/80 text-xs h-7 rounded-md"
                                    >
                                        {createThread.isPending ? (
                                            <Loader2 className="size-3 animate-spin" />
                                        ) : (
                                            <Plus className="size-3" />
                                        )}
                                        New Thread
                                    </Button>
                                </div>

                                {/* Thread list — compact, DeepSeek-style */}
                                <div className="flex-1 overflow-y-auto px-1 py-1 space-y-px">
                                    {isLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="size-5 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : threads.length === 0 ? (
                                        <div className="text-center py-12 px-4">
                                            <MessageSquarePlus className="size-8 mx-auto text-zinc-600 mb-3" />
                                            <p className="text-sm text-zinc-500">Start a Thread</p>
                                            <p className="text-xs text-zinc-600 mt-1">
                                                Reply to continue the conversation in this thread.
                                            </p>
                                        </div>
                                    ) : (
                                        threads.map((thread) => (
                                            <ThreadListItem
                                                key={thread.id}
                                                thread={thread}
                                                isActive={currentThreadId === thread.id}
                                                onClick={() => handleThreadClick(thread)}
                                            />
                                        ))
                                    )}
                                </div>
                            </>
                        )}

                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ThreadConversation - Uses ChatMessage + ChatInputBox with its own WS streaming
// ============================================================================

function ThreadConversation({ threadId }: { threadId: number }) {
    const { data: messagesData, isLoading } = useThreadMessages(threadId);
    const [threadMessage, setThreadMessage] = useState('');
    const [threadMode, setThreadMode] = useState('direct');
    const [isSending, setIsSending] = useState(false);
    const [threadStreaming, setThreadStreaming] = useState(false);
    const [threadStreamContent, setThreadStreamContent] = useState('');
    const [threadStreamThinking, setThreadStreamThinking] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    // Get session ID from the thread store context
    const context = useThreadStore((s) => s.context);
    const sessionId = context.mode === 'thread' && context.thread?.sessionId
        ? context.thread.sessionId
        : 0;

    // ── WebSocket subscription for thread-scoped streaming ──
    // Only processes events that carry OUR thread_id
    useEffect(() => {
        if (!sessionId || !threadId) return;

        const manager = getWebSocketManager();
        const channel = `chat:${sessionId}`;

        const handleThreadEvent = (msg: any) => {
            const eventType = msg.type || msg.event;
            const eventData = msg.data || msg;

            // Only process events for THIS thread
            if (eventData.thread_id !== threadId) return;

            switch (eventType) {
                case 'token':
                    setThreadStreaming(true);
                    setThreadStreamContent(prev => prev + (eventData.text || ''));
                    break;
                case 'thinking':
                    setThreadStreaming(true);
                    setThreadStreamThinking(prev => prev + (eventData.text || ''));
                    break;
                case 'complete':
                    setThreadStreaming(false);
                    // Refetch thread messages to get the saved assistant message
                    setTimeout(() => {
                        queryClient.invalidateQueries({
                            queryKey: ['threads', 'messages', threadId],
                        });
                        setThreadStreamContent('');
                        setThreadStreamThinking('');
                    }, 100);
                    break;
                case 'error':
                    setThreadStreaming(false);
                    setThreadStreamContent('');
                    setThreadStreamThinking('');
                    break;
            }
        };

        const unsub = manager.subscribe(channel, handleThreadEvent);
        return () => unsub();
    }, [sessionId, threadId, queryClient]);

    // Auto-scroll when messages or streaming content change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messagesData, threadStreamContent]);

    const handleSend = () => {
        const text = threadMessage.trim();
        if (!text || isSending || !sessionId) return;

        const manager = getWebSocketManager();
        if (!manager.isConnected()) {
            console.error('[Thread] WebSocket not connected');
            return;
        }

        setThreadMessage('');
        setIsSending(true);

        try {
            const channel = `chat:${sessionId}`;
            manager.send({
                type: 'thread_message',
                channel,
                threadId,
                content: text,
            });

            // Refetch to show optimistic user message
            setTimeout(() => {
                queryClient.invalidateQueries({
                    queryKey: ['threads', 'messages', threadId],
                });
                setIsSending(false);
            }, 300);
        } catch (error) {
            console.error('Failed to send thread message:', error);
            setThreadMessage(text);
            setIsSending(false);
        }
    };

    const messages: ChatMessageResponse[] = Array.isArray(messagesData)
        ? messagesData
        : (messagesData as any)?.messages ?? [];

    return (
        <>
            {/* Messages — uses the SAME ChatMessage component as main chat */}
            <div className="flex-1 overflow-y-auto min-h-0">
                <div className="max-w-3xl mx-auto px-4 py-4 space-y-2">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="size-5 animate-spin text-zinc-500" />
                        </div>
                    ) : messages.length === 0 && !threadStreaming ? (
                        <div className="text-center py-16 px-4">
                            <MessageSquarePlus className="size-10 mx-auto text-zinc-700 mb-3" />
                            <p className="text-sm text-zinc-500">Start the conversation</p>
                            <p className="text-xs text-zinc-600 mt-1">
                                Messages in this thread stay separate from the main chat.
                            </p>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg) => (
                                <ChatMessage
                                    key={msg.id}
                                    message={msg}
                                />
                            ))}

                            {/* Streaming AI response for this thread */}
                            {threadStreaming && threadStreamContent && (
                                <ChatMessage
                                    message={{
                                        id: -1,
                                        session_id: sessionId,
                                        role: 'assistant' as const,
                                        content: threadStreamContent,
                                        tokens: 0,
                                        model_used: null,
                                        function_calls: null,
                                        grounding_sources: null,
                                        created_at: new Date().toISOString(),
                                    }}
                                    isStreaming={true}
                                    thinking={threadStreamThinking}
                                />
                            )}
                        </>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input — reuses the REAL ChatInputBox with minimal mode */}
            <div className="px-4 pb-3">
                <ChatInputBox
                    message={threadMessage}
                    onMessageChange={setThreadMessage}
                    onSend={handleSend}
                    isStreaming={threadStreaming}
                    placeholder="Reply to thread..."
                    minimal
                    mode={threadMode}
                    onModeChange={setThreadMode}
                />
            </div>
        </>
    );
}


