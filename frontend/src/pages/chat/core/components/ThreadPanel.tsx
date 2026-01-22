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
 * - Return to main conversation
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, MessageSquarePlus, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/shared/ui';
import { useThreadStore, useCurrentThreadId } from '../state/threadStore';
import { ThreadListItem } from './ThreadListItem';
import { useThreads, useCreateThread } from '../hooks/useThreads';

interface ThreadPanelProps {
    sessionId: number;
}

export function ThreadPanel({ sessionId }: ThreadPanelProps) {
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
                title: undefined, // Auto-generate
            });
            addThread(newThread);
            switchToThread(newThread.id, newThread);
        } catch (error) {
            console.error('Failed to create thread:', error);
        }
    };

    // Handle thread click
    const handleThreadClick = (thread: typeof threads[0]) => {
        switchToThread(thread.id, thread);
    };

    return (
        <AnimatePresence>
            {isPanelOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/40 z-40"
                        onClick={closePanel}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-80 z-50 flex flex-col"
                    >
                        <GlassCard className="h-full rounded-none rounded-l-2xl border-l border-white/10 bg-zinc-900/95 backdrop-blur-xl flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <MessageSquarePlus className="size-5 text-cyan-400" />
                                    <h2 className="font-semibold text-lg">Threads</h2>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={closePanel}
                                    className="size-8 rounded-full"
                                >
                                    <X className="size-4" />
                                </Button>
                            </div>

                            {/* Context indicator */}
                            {context.mode === 'thread' && (
                                <div className="px-4 py-2 bg-cyan-500/10 border-b border-cyan-500/20">
                                    <button
                                        onClick={switchToMain}
                                        className="flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200 transition-colors"
                                    >
                                        <ArrowLeft className="size-3" />
                                        Back to main conversation
                                    </button>
                                </div>
                            )}

                            {/* New Thread Button */}
                            <div className="p-4 border-b border-white/5">
                                <Button
                                    onClick={handleCreateThread}
                                    disabled={createThread.isPending}
                                    className="w-full gap-2 bg-cyan-600 hover:bg-cyan-500"
                                >
                                    {createThread.isPending ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <Plus className="size-4" />
                                    )}
                                    New Thread
                                </Button>
                            </div>

                            {/* Thread List */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {isLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                                    </div>
                                ) : threads.length === 0 ? (
                                    <div className="text-center py-8 px-4">
                                        <MessageSquarePlus className="size-8 mx-auto text-muted-foreground/30 mb-3" />
                                        <p className="text-sm text-muted-foreground">
                                            No threads yet
                                        </p>
                                        <p className="text-xs text-muted-foreground/60 mt-1">
                                            Start a new thread to explore topics separately
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

                            {/* Footer tip */}
                            <div className="p-3 border-t border-white/5">
                                <p className="text-[10px] text-muted-foreground/50 text-center">
                                    Threads change the question. Branches change the answer.
                                </p>
                            </div>
                        </GlassCard>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
