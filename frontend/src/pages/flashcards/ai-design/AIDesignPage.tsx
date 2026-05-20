/**
 * AIDesignPage — Conversation-first AI card creation.
 *
 * Split layout:
 *  Left (flex-1)  — chat conversation with the AI designer
 *  Right (380px)  — live card plan proposal panel
 *
 * Flow:
 *  1. Page loads → POST /ai/design/session to get/resume a session_id
 *  2. useCardDesignChat wraps that session in a streaming chat hook
 *  3. AI designer interviews the user, then calls propose_card_plan (tool)
 *  4. Hook detects the tool call → populates proposedPlan state
 *  5. CardPlanProposal renders the plan; "Generate" calls acceptPlan()
 *  6. acceptPlan() → POST /ai/design/generate → injects card previews → redirects
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Sparkles,
    Send,
    Square,
    Loader2,
    RotateCcw,
    History,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { getAuthToken } from '@/api/client';
import { cn } from '@/lib/utils';
import MarkdownRenderer from '@/shared/rendering/MarkdownRenderer';

import { useCardDesignChat } from './hooks/useCardDesignChat';
import { CardPlanProposal } from './components/CardPlanProposal';
import { SourceDropZone } from './components/SourceDropZone';
import { FlashcardPreview, type PreviewCard } from './components/FlashcardPreview';
import { DeckPickerModal } from './components/DeckPickerModal';
import { DesignHistoryDrawer } from './components/DesignHistoryDrawer';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// ---------------------------------------------------------------------------
// Session bootstrap helper
// ---------------------------------------------------------------------------

interface SessionResult {
    session_id: number;
    deck_name?: string;
    is_resumed: boolean;
}

async function getOrCreateDesignSession(deckId?: number): Promise<SessionResult> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/api/v1/ai/design/session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ deck_id: deckId ?? null }),
    });
    if (!res.ok) throw new Error('Failed to start design session');
    return res.json();
}

// ---------------------------------------------------------------------------
// Greeting (shown only for new sessions)
// ---------------------------------------------------------------------------

const GREETING = `## Welcome to AI Card Designer ✦

I'm your learning designer. Instead of filling out a form, we're going to have a conversation first.

**Tell me:**
- What are you trying to learn?
- Where are you currently with this subject?

The more you tell me, the better I can tailor your card set. Let's start.`;

// ---------------------------------------------------------------------------
// Post-generation card preview fetcher
// ---------------------------------------------------------------------------

async function fetchPreviewCards(deckId: number): Promise<PreviewCard[]> {
    try {
        const token = await getAuthToken();
        const res = await fetch(`${API_BASE}/api/v1/flashcards/?deck_id=${deckId}&limit=6`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return [];
        const data = await res.json();
        const cards = Array.isArray(data) ? data : (data.items ?? data.cards ?? []);
        return cards.map((c: Record<string, unknown>) => ({
            id:         Number(c.id),
            front_text: String(c.front_text ?? c.front ?? ''),
            back_text:  String(c.back_text ?? c.back ?? ''),
            card_type:  String(c.card_type ?? 'basic'),
        }));
    } catch {
        return [];
    }
}

// ---------------------------------------------------------------------------
// Strip raw tool-call JSON blocks from rendered assistant text
// ---------------------------------------------------------------------------

/**
 * When the model text-encodes a tool call as a ```json {"name":"propose_card_plan",...} ```
 * block, we DON'T want to show it in chat (the plan panel handles it).
 * This helper removes any code-fence block whose parsed JSON has
 * name === 'propose_card_plan', and trims the remaining content.
 */
function stripToolCallBlock(text: string): string {
    return text
        .replace(/```(?:json)?\s*([\s\S]*?)```/g, (block, inner: string) => {
            try {
                const parsed = JSON.parse(inner.trim()) as Record<string, unknown>;
                if (
                    parsed.name === 'propose_card_plan' ||
                    parsed.tool === 'propose_card_plan'
                ) {
                    return '';  // drop the block entirely
                }
            } catch { /* keep non-JSON or unrelated code blocks */ }
            return block;
        })
        .trim();
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function AIDesignPage() {
    const { deckId } = useParams<{ deckId?: string }>();
    const navigate = useNavigate();
    const parsedDeckId = deckId ? parseInt(deckId, 10) : undefined;

    const [sessionId, setSessionId]             = useState<number | null>(null);
    const [sessionDeckName, setSessionDeckName] = useState<string | undefined>();
    const [isResumed, setIsResumed]             = useState(false);
    const [isBootstrapping, setIsBootstrapping] = useState(true);
    const [input, setInput]                     = useState('');
    const [previewCards, setPreviewCards]       = useState<PreviewCard[] | null>(null);
    // History drawer & collapsible prior-messages panel
    const [showHistory, setShowHistory]         = useState(false);
    const [historyExpanded, setHistoryExpanded] = useState(false);
    // Post-generation state machine
    const [generatedResult, setGeneratedResult] = useState<{
        deck_id: number; deck_name: string; cards_generated: number;
    } | null>(null);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef  = useRef<HTMLTextAreaElement>(null);

    const {
        messages,
        status,
        proposedPlan,
        isGenerating,
        historicalCount,
        sendMessage,
        attachSource,
        acceptPlan,
        adjustPlan,
    } = useCardDesignChat(sessionId);

    // ── Bootstrap session ───────────────────────────────────────────────────
    // Only fires when parsedDeckId is defined (set after DeckPickerModal confirms)
    useEffect(() => {
        if (!parsedDeckId) {
            setIsBootstrapping(false);
            return;
        }
        setIsBootstrapping(true);
        getOrCreateDesignSession(parsedDeckId)
            .then(({ session_id, deck_name, is_resumed }) => {
                setSessionId(session_id);
                setSessionDeckName(deck_name);
                setIsResumed(is_resumed);
            })
            .catch(() => toast.error('Could not start design session. Please try again.'))
            .finally(() => setIsBootstrapping(false));
    }, [parsedDeckId]);

    // ── Session switch from history drawer ──────────────────────────────────
    const handleSessionSwitch = useCallback(
        async (newSessionId: number, newDeckId: number | null) => {
            // If the session belongs to a different deck, navigate to that URL
            // (which re-triggers the bootstrap effect with the new parsedDeckId)
            if (newDeckId && newDeckId !== parsedDeckId) {
                navigate(`/flashcards/${newDeckId}/ai-design`);
                return;
            }
            // Same deck or deck-less: just swap the session id directly
            setSessionId(newSessionId);
            setHistoryExpanded(false);
        },
        [parsedDeckId, navigate],
    );

    // ── DeckPicker: user selects/creates deck ───────────────────────────────
    const handleDeckPicked = useCallback(
        (deckId: number, deckName: string) => {
            // Navigate to deck-specific URL — triggers bootstrap effect
            setSessionDeckName(deckName);
            navigate(`/flashcards/${deckId}/ai-design`);
        },
        [navigate],
    );

    // Auto-scroll on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, previewCards]);

    const handleSend = useCallback(() => {
        const text = input.trim();
        if (!text || status === 'submitted' || status === 'streaming') return;
        sendMessage({ text });
        setInput('');
    }, [input, status, sendMessage]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleAccept = async () => {
        const result = await acceptPlan();
        if (!result) {
            toast.error('Generation failed. Please try again.');
            return;
        }
        toast.success(`${result.cards_generated} cards created in "${result.deck_name}"!`);
        // Store result — navigating is now the user's choice via "View Deck" button
        setGeneratedResult(result);

        // Still show the inline preview in chat
        const previews = await fetchPreviewCards(result.deck_id);
        if (previews.length > 0) setPreviewCards(previews);
    };

    const handleDesignMore = () => {
        // Reset the generated state so the generate button reappears
        // (the plan stays — user can tweak counts or ask AI for a new plan)
        setGeneratedResult(null);
        setPreviewCards(null);
    };

    const isStreaming = status === 'submitted' || status === 'streaming';

    return (
        <div className="fixed inset-0 min-h-screen flex flex-col bg-background text-foreground pt-16">

            {/* ── Top Bar ──────────────────────────────────────────────── */}
            <div className="flex-none h-14 border-b border-border bg-background/70 backdrop-blur-xl z-20 px-6 flex items-center gap-4">
                <button
                    onClick={() => navigate(parsedDeckId ? `/flashcards/${parsedDeckId}` : '/flashcards')}
                    className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h1 className="text-sm font-bold text-foreground">AI Card Designer</h1>
                    {sessionDeckName && (
                        <span className="text-xs text-muted-foreground">→ {sessionDeckName}</span>
                    )}
                </div>

                {/* Resumed badge */}
                <AnimatePresence>
                    {isResumed && !isBootstrapping && (
                        <motion.div
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 border border-primary/20"
                        >
                            <RotateCcw className="h-3 w-3 text-primary" />
                            <span className="text-[10px] text-primary font-medium">Resumed</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex-1" />

                {/* History button */}
                <button
                    onClick={() => setShowHistory(true)}
                    title="Design history"
                    className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <History className="h-4 w-4" />
                </button>

                <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest hidden sm:block">
                    Conversation-first creation
                </span>
            </div>

            {/* ── Deck Picker (shown when no deck selected yet) ────────────── */}
            {!parsedDeckId && !isBootstrapping && (
                <DeckPickerModal onSelect={handleDeckPicked} />
            )}

            {/* ── History Drawer ───────────────────────────────────────────── */}
            <DesignHistoryDrawer
                open={showHistory}
                currentSessionId={sessionId}
                onClose={() => setShowHistory(false)}
                onSessionSelect={handleSessionSwitch}
            />

            {/* ── Split Body ─────────────────────────────────────────────── */}
            <div className="flex-1 overflow-hidden flex">

                {/* LEFT: Chat panel */}
                <div className="flex-1 flex flex-col min-w-0 border-r border-border">

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">

                        {/* Static greeting — only for new sessions */}
                        {!isResumed && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="max-w-[80%] mr-auto"
                            >
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                                    </div>
                                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">AI Designer</span>
                                </div>
                                <div className="bg-card border border-border/60 rounded-2xl rounded-tl-sm px-4 py-3">
                                    <MarkdownRenderer
                                        content={GREETING}
                                        className="prose prose-sm dark:prose-invert max-w-none [&_p]:text-sm [&_p]:leading-relaxed [&_p]:my-1 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-0 [&_strong]:font-semibold"
                                    />
                                </div>
                            </motion.div>
                        )}

                        {/* Live messages from the session */}

                        {/* ── Collapsible prior conversation ───────────────────── */}
                        {historicalCount > 0 && (
                            <div className="space-y-2">
                                <button
                                    onClick={() => setHistoryExpanded((x) => !x)}
                                    className="w-full flex items-center gap-3 py-1.5 group"
                                >
                                    <div className="flex-1 h-px bg-border/40" />
                                    <span className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/60 hover:text-muted-foreground transition-colors shrink-0">
                                        {historyExpanded
                                            ? <ChevronUp className="h-3 w-3" />
                                            : <ChevronDown className="h-3 w-3" />}
                                        {historyExpanded ? 'Hide' : `${historicalCount} prior message${historicalCount !== 1 ? 's' : ''}`}
                                    </span>
                                    <div className="flex-1 h-px bg-border/40" />
                                </button>

                                <AnimatePresence>
                                    {historyExpanded && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden space-y-4 opacity-70"
                                        >
                                            {messages.slice(0, historicalCount).map((msg) => {
                                                const isAssistant = msg.role === 'assistant';
                                                const rawText = (msg.parts ?? [])
                                                    .filter((p) => p.type === 'text')
                                                    .map((p) => (p as { text: string }).text)
                                                    .join('');
                                                const text = isAssistant ? stripToolCallBlock(rawText) : rawText;
                                                if (!text.trim()) return null;
                                                return (
                                                    <div
                                                        key={msg.id}
                                                        className={cn('flex', isAssistant ? 'justify-start' : 'justify-end')}
                                                    >
                                                        <div className={cn('max-w-[80%] rounded-2xl px-4 py-3 text-sm',
                                                            isAssistant
                                                                ? 'bg-muted/50 border border-border/40 rounded-tl-sm'
                                                                : 'bg-primary/20 text-foreground rounded-tr-sm'
                                                        )}>
                                                            {isAssistant ? (
                                                                <MarkdownRenderer
                                                                    content={text}
                                                                    className="prose prose-sm dark:prose-invert max-w-none [&_p]:text-sm [&_p]:leading-relaxed [&_p]:my-1"
                                                                />
                                                            ) : (
                                                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Divider between history and current session */}
                                {!historyExpanded && (
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-px bg-border/30" />
                                        <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest">
                                            Continuing
                                        </span>
                                        <div className="flex-1 h-px bg-border/30" />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* New messages (idx >= historicalCount) */}
                        {messages.slice(historicalCount).map((msg, idx) => {
                            const isAssistant = msg.role === 'assistant';
                            const rawText = (msg.parts ?? [])
                                .filter((p) => p.type === 'text')
                                .map((p) => (p as { text: string }).text)
                                .join('');

                            // Strip raw tool-call JSON blocks from assistant bubbles
                            const text = isAssistant ? stripToolCallBlock(rawText) : rawText;

                            if (!text.trim()) return null;

                            return (
                                <motion.div
                                    key={msg.id ?? idx}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn('flex', isAssistant ? 'justify-start' : 'justify-end')}
                                >
                                    <div className={cn('max-w-[80%]', isAssistant ? 'mr-auto' : 'ml-auto')}>
                                        {isAssistant && (
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                                                </div>
                                                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">AI Designer</span>
                                            </div>
                                        )}
                                        <div className={cn(
                                            'rounded-2xl px-4 py-3 text-sm',
                                            isAssistant
                                                ? 'bg-card border border-border/60 rounded-tl-sm'
                                                : 'bg-primary text-primary-foreground rounded-tr-sm'
                                        )}>
                                            {isAssistant ? (
                                                <MarkdownRenderer
                                                    content={text}
                                                    className="prose prose-sm dark:prose-invert max-w-none [&_p]:text-sm [&_p]:leading-relaxed [&_p]:my-1 [&_strong]:font-semibold"
                                                />
                                            ) : (
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}

                        {/* Streaming indicator */}
                        {isStreaming && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center gap-2 mr-auto"
                            >
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <div className="flex gap-1 items-center bg-card border border-border rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                                    {[0, 1, 2].map((i) => (
                                        <motion.div
                                            key={i}
                                            className="w-1.5 h-1.5 rounded-full bg-primary/60"
                                            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Bootstrapping state */}
                        {isBootstrapping && (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Preparing your session…</span>
                            </div>
                        )}

                        {/* Post-generation card previews */}
                        <AnimatePresence>
                            {previewCards && previewCards.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mr-auto max-w-[90%]"
                                >
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                                        </div>
                                        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">AI Designer</span>
                                    </div>
                                    <div className="bg-card border border-border/60 rounded-2xl rounded-tl-sm px-4 py-3 space-y-3">
                                        <p className="text-sm text-foreground font-medium">
                                            ✓ Cards generated — here's a preview. Taking you to the deck…
                                        </p>
                                        <div className="flex gap-3 overflow-x-auto pb-1">
                                            {previewCards.map((card) => (
                                                <FlashcardPreview key={card.id} card={card} />
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div ref={bottomRef} />
                    </div>

                    {/* Input area */}
                    <div className="shrink-0 px-6 py-4 border-t border-border space-y-2">
                        <SourceDropZone onAttach={attachSource} />

                        <div className="flex items-end gap-3">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={isBootstrapping ? 'Setting up session…' : 'Tell the AI designer what you want to learn…'}
                                disabled={isBootstrapping || !sessionId}
                                rows={2}
                                className="flex-1 resize-none bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-colors disabled:opacity-50 leading-relaxed"
                            />
                            <button
                                onClick={isStreaming ? undefined : handleSend}
                                disabled={isBootstrapping || !sessionId || (!isStreaming && !input.trim())}
                                className="p-3 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 transition-all hover:bg-primary/90 shrink-0"
                            >
                                {isStreaming ? (
                                    <Square className="h-4 w-4" fill="currentColor" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center">
                            Press <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[9px]">Enter</kbd> to send ·{' '}
                            <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[9px]">Shift+Enter</kbd> for newline
                        </p>
                    </div>
                </div>

                {/* RIGHT: Proposal panel */}
                <div className="w-[380px] shrink-0 flex flex-col bg-background/50">
                    <CardPlanProposal
                        plan={proposedPlan}
                        isGenerating={isGenerating}
                        onAccept={handleAccept}
                        onAdjust={adjustPlan}
                        generatedResult={generatedResult}
                        onDesignMore={handleDesignMore}
                    />
                </div>
            </div>
        </div>
    );
}
