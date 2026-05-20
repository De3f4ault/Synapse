/**
 * DesignHistoryDrawer
 *
 * Slide-in panel that lists all past AI Card Designer sessions for the user.
 * Fetches from GET /api/v1/ai/design/sessions. Clicking a session calls
 * onSessionSelect(session_id, deck_id) which lets the parent switch context.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layers, Clock, Loader2, Inbox, ChevronRight } from 'lucide-react';
import { getAuthToken } from '@/api/client';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

interface SessionEntry {
    session_id: number;
    deck_id: number | null;
    deck_name: string;
    card_count: number;
    last_message_preview: string | null;
    updated_at: string;
}

interface DesignHistoryDrawerProps {
    open: boolean;
    currentSessionId: number | null;
    onClose: () => void;
    onSessionSelect: (sessionId: number, deckId: number | null) => void;
}

function timeAgo(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60_000);
    if (mins < 1)   return 'just now';
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7)   return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function DesignHistoryDrawer({
    open,
    currentSessionId,
    onClose,
    onSessionSelect,
}: DesignHistoryDrawerProps) {
    const [sessions, setSessions] = useState<SessionEntry[]>([]);
    const [loading, setLoading]   = useState(false);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        (async () => {
            try {
                const token = await getAuthToken();
                const res = await fetch(`${API_BASE}/api/v1/ai/design/sessions`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (res.ok) {
                    setSessions(await res.json());
                }
            } catch {
                /* silently fail — drawer just shows empty */
            } finally {
                setLoading(false);
            }
        })();
    }, [open]);

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-background/40 backdrop-blur-[2px]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="fixed top-0 right-0 bottom-0 z-50 w-80 bg-card border-l border-border/60 flex flex-col shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-4 border-b border-border/40 shrink-0">
                            <div>
                                <h3 className="text-sm font-semibold">Design History</h3>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    All your card design sessions
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors"
                            >
                                <X className="h-4 w-4 text-muted-foreground" />
                            </button>
                        </div>

                        {/* Session list */}
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                </div>
                            ) : sessions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                    <Inbox className="h-8 w-8 text-muted-foreground/30 mb-3" />
                                    <p className="text-sm text-muted-foreground">No design sessions yet</p>
                                    <p className="text-xs text-muted-foreground/60 mt-1">
                                        Start a conversation with the AI Designer to see history here.
                                    </p>
                                </div>
                            ) : (
                                <div className="p-2 space-y-1">
                                    {sessions.map((s) => {
                                        const isCurrent = s.session_id === currentSessionId;
                                        return (
                                            <button
                                                key={s.session_id}
                                                onClick={() => {
                                                    onSessionSelect(s.session_id, s.deck_id);
                                                    onClose();
                                                }}
                                                className={cn(
                                                    'w-full text-left flex items-start gap-3 px-3 py-3 rounded-xl transition-colors group',
                                                    isCurrent
                                                        ? 'bg-primary/10 border border-primary/20'
                                                        : 'hover:bg-muted/50 border border-transparent'
                                                )}
                                            >
                                                {/* Deck icon */}
                                                <div className={cn(
                                                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                                                    isCurrent ? 'bg-primary/20' : 'bg-muted'
                                                )}>
                                                    <Layers className={cn(
                                                        'h-4 w-4',
                                                        isCurrent ? 'text-primary' : 'text-muted-foreground/70'
                                                    )} />
                                                </div>

                                                {/* Details */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-1">
                                                        <p className="text-sm font-medium truncate leading-snug">
                                                            {s.deck_name}
                                                        </p>
                                                        {isCurrent && (
                                                            <span className="text-[9px] font-mono bg-primary/15 text-primary px-1.5 py-0.5 rounded-full shrink-0">
                                                                Active
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <Clock className="h-3 w-3 text-muted-foreground/50" />
                                                        <span className="text-[10px] text-muted-foreground/60">
                                                            {timeAgo(s.updated_at)}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground/40">·</span>
                                                        <span className="text-[10px] text-muted-foreground/60">
                                                            {s.card_count} card{s.card_count !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>

                                                    {s.last_message_preview && (
                                                        <p className="text-[10px] text-muted-foreground/50 mt-1 line-clamp-2 leading-relaxed">
                                                            {s.last_message_preview}
                                                        </p>
                                                    )}
                                                </div>

                                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors shrink-0 mt-1" />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
