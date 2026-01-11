/**
 * DeckDetailPage - "Learning Cockpit" (V4)
 * 
 * A 3-panel intelligent study interface:
 * - Left: Card List with Mastery Spark Charts
 * - Center: Knowledge Focus Zone with Stats Bar
 * - Right: Context Dock (Related Cards, AI Insight)
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Play,
    Clock,
    Search,
    History,
    Edit3,
    BrainCircuit,
    Calendar,
    TrendingUp,
    Sparkles,
    Link2,
    ChevronRight,
    Settings,
    MessageSquare
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { FlashcardsService } from '@/api/generated';
import { cn } from '@/lib/utils';

// Core Imports
import { useDeck } from './list';
import { useActiveDeck, type Flashcard, type LearningState } from './core';

// Shared
import { EmptyState } from '@/shared/ui';
import GlassCard from '@/components/ui/GlassCard';

// ----------------------------------------------------------------------
// TYPES & HELPERS
// ----------------------------------------------------------------------

const STATE_CONFIG: Record<LearningState, { color: string; label: string; dotColor: string }> = {
    new: { color: 'text-slate-400', label: 'New', dotColor: 'bg-slate-500' },
    learning: { color: 'text-amber-400', label: 'Learning', dotColor: 'bg-amber-400' },
    review: { color: 'text-cyan-400', label: 'Review', dotColor: 'bg-cyan-400' },
    mastered: { color: 'text-emerald-400', label: 'Mastered', dotColor: 'bg-emerald-400' },
};

// Generate mock spark chart data (7 days)
function generateSparkData(state: LearningState): number[] {
    if (state === 'new') return [0, 0, 0, 0, 0, 0, 0];
    if (state === 'mastered') return [1, 1, 1, 1, 1, 1, 1];
    // Random for learning/review
    return Array.from({ length: 7 }, () => Math.random() > 0.4 ? 1 : 0);
}

// Mini Spark Chart Component
function SparkChart({ data }: { data: number[] }) {
    return (
        <div className="flex items-center gap-0.5">
            {data.map((val, i) => (
                <div
                    key={i}
                    className={cn(
                        "w-1.5 h-1.5 rounded-full transition-colors",
                        val === 1 ? "bg-emerald-400" : "bg-slate-700"
                    )}
                />
            ))}
        </div>
    );
}

// ----------------------------------------------------------------------
// LEFT PANEL: Card List Item
// ----------------------------------------------------------------------

function CardListItem({
    card,
    active,
    onClick
}: {
    card: Flashcard;
    active: boolean;
    onClick: () => void
}) {
    const config = STATE_CONFIG[card.learning_state];
    const sparkData = useMemo(() => generateSparkData(card.learning_state), [card.learning_state]);

    return (
        <motion.div
            layout
            onClick={onClick}
            className={cn(
                "group p-3 rounded-xl cursor-pointer transition-all duration-200 border",
                active
                    ? "bg-white/5 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.1)]"
                    : "bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5"
            )}
        >
            <div className="flex items-start gap-3">
                {/* Status Dot */}
                <div className={cn("mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0", config.dotColor)} />

                <div className="flex-1 min-w-0">
                    {/* Status Label */}
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider", config.color)}>
                        {config.label}
                    </span>

                    {/* Question Text */}
                    <p className={cn(
                        "text-sm font-medium mt-1 line-clamp-2 transition-colors",
                        active ? "text-white" : "text-slate-300 group-hover:text-white"
                    )}>
                        {card.front_text}
                    </p>

                    {/* Spark Chart */}
                    <div className="mt-2">
                        <SparkChart data={sparkData} />
                    </div>
                </div>

                {active && <ChevronRight className="w-4 h-4 text-cyan-400 mt-1 flex-shrink-0" />}
            </div>
        </motion.div>
    );
}

// ----------------------------------------------------------------------
// RIGHT PANEL: Context Dock
// ----------------------------------------------------------------------

function ContextDock({ card, allCards }: { card: Flashcard | undefined; allCards: Flashcard[] }) {
    // Find related cards (simple: same learning state or random for demo)
    const relatedCards = useMemo(() => {
        if (!card) return [];
        return allCards
            .filter(c => c.id !== card.id)
            .slice(0, 3);
    }, [card, allCards]);

    return (
        <div className="w-72 flex-shrink-0 border-l border-white/5 bg-black/20 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Context Panel</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
                {/* Related Cards */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Link2 size={12} />
                        Related Cards
                    </h4>
                    {relatedCards.length > 0 ? (
                        <div className="space-y-2">
                            {relatedCards.map(rc => (
                                <div key={rc.id} className="p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 cursor-pointer transition-colors">
                                    <p className="text-xs text-slate-300 line-clamp-2">{rc.front_text}</p>
                                </div>
                            ))}
                            <button className="w-full py-2 text-xs text-slate-500 hover:text-white transition-colors">
                                Show More
                            </button>
                        </div>
                    ) : (
                        <p className="text-xs text-slate-600">No related cards found.</p>
                    )}
                </div>

                {/* AI Insight */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles size={12} className="text-purple-400" />
                        AI Insight
                    </h4>
                    <GlassCard className="p-4 bg-purple-500/5 border-purple-500/10">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/10">
                                <BrainCircuit size={16} className="text-purple-400" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-purple-300 mb-1">Intelligent Note</p>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    {card ? (
                                        <>This concept connects to <span className="text-cyan-400">'Memory Management'</span> and <span className="text-cyan-400">'Cognitive Load Theory'</span>. Understanding this is crucial for optimizing long-term retention.</>
                                    ) : (
                                        "Select a card to see AI insights."
                                    )}
                                </p>
                            </div>
                        </div>
                    </GlassCard>
                    <button className="w-full py-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium hover:bg-purple-500/20 transition-colors flex items-center justify-center gap-2">
                        <MessageSquare size={14} />
                        Ask AI
                    </button>
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// MAIN PAGE COMPONENT
// ----------------------------------------------------------------------

export function DeckDetailPage() {
    const { deckId } = useParams<{ deckId: string }>();
    const navigate = useNavigate();
    const id = parseInt(deckId || '0', 10);

    // Selected Card State
    const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Sync with Core
    useActiveDeck({ deckId: id });

    // Queries
    const { data: deck, isLoading: deckLoading } = useDeck(id);
    const { data: cardsResponse, isLoading: cardsLoading } = useQuery({
        queryKey: queryKeys.decks.cards(id),
        queryFn: () => FlashcardsService.listDeckCardsApiV1DecksDeckIdCardsGet(id),
        enabled: !!id,
    });

    const cards = useMemo(() => cardsResponse as Flashcard[] | undefined, [cardsResponse]);

    // Derived State
    const activeCard = useMemo(() =>
        cards?.find(c => c.id === selectedCardId) || cards?.[0],
        [cards, selectedCardId]
    );

    const filteredCards = useMemo(() => {
        if (!cards) return [];
        if (!searchQuery) return cards;
        const q = searchQuery.toLowerCase();
        return cards.filter(c =>
            c.front_text.toLowerCase().includes(q) ||
            c.back_text.toLowerCase().includes(q)
        );
    }, [cards, searchQuery]);

    // Stats
    const masteredCount = cards?.filter(c => c.learning_state === 'mastered').length || 0;
    const masteryPercent = cards?.length ? Math.round((masteredCount / cards.length) * 100) : 0;

    // Loading / Error States
    if (deckLoading || cardsLoading) {
        return (
            <div className="fixed inset-0 min-h-screen nm-bg nm-constellation-bg flex items-center justify-center">
                <div className="text-slate-500 text-sm">Loading deck...</div>
            </div>
        );
    }
    if (!deck) return <EmptyState title="Deck not found" />;

    return (
        <div className="fixed inset-0 min-h-screen nm-bg nm-constellation-bg flex flex-col pt-16">

            {/* HEADER */}
            <div className="flex-none h-14 px-6 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between z-20">
                {/* Left: Back + Title */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/flashcards')}
                        className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Card Deck:</span>
                            <h1 className="text-sm font-bold text-white">{deck.name}</h1>
                        </div>
                    </div>
                </div>

                {/* Center: Stats Bar */}
                {activeCard && (
                    <div className="hidden md:flex items-center gap-8 px-6 py-2 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={14} className="text-emerald-400" />
                            <span className="text-xs text-slate-400">Recall Rate:</span>
                            <span className="text-xs font-bold text-emerald-400">{((activeCard.accuracy || 0.85) * 100).toFixed(0)}% ↑</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock size={14} className="text-slate-500" />
                            <span className="text-xs text-slate-400">Last Reviewed:</span>
                            <span className="text-xs font-bold text-white">
                                {activeCard.last_review ? `${Math.floor((Date.now() - new Date(activeCard.last_review).getTime()) / 86400000)} days ago` : 'Never'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-cyan-400" />
                            <span className="text-xs text-slate-400">Next Review:</span>
                            <span className="text-xs font-bold text-cyan-400">
                                {activeCard.next_review ? new Date(activeCard.next_review).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Now'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Right: Actions */}
                <div className="flex items-center gap-3">
                    <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                        <Settings size={18} />
                    </button>
                    <button
                        onClick={() => navigate(`/flashcards/${id}/review`)}
                        className="flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-all"
                    >
                        <Play size={14} fill="currentColor" />
                        Start Session
                    </button>
                </div>
            </div>

            {/* MAIN 3-PANEL LAYOUT */}
            <div className="flex-1 overflow-hidden flex">

                {/* LEFT PANEL: Card List */}
                <div className="w-80 flex-shrink-0 border-r border-white/5 bg-black/20 flex flex-col">
                    {/* Search */}
                    <div className="p-4 border-b border-white/5">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search questions..."
                                className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all"
                            />
                        </div>
                    </div>

                    {/* Card List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
                        <AnimatePresence>
                            {filteredCards.map(card => (
                                <CardListItem
                                    key={card.id}
                                    card={card}
                                    active={activeCard?.id === card.id}
                                    onClick={() => setSelectedCardId(card.id)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/5 bg-black/30">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                            <span>Deck Progress:</span>
                            <span className="font-bold text-white">{masteryPercent}% Mastered</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${masteryPercent}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                        </div>
                    </div>
                </div>

                {/* CENTER PANEL: Knowledge Focus Zone */}
                <div className="flex-1 bg-[#0a0a0e] relative overflow-hidden flex flex-col items-center justify-center p-8">
                    {activeCard ? (
                        <motion.div
                            className="w-full max-w-2xl space-y-6"
                            key={activeCard.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Question Card - Premium Flashcard Style */}
                            <div className="relative group">
                                {/* Outer Glow */}
                                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500" />

                                <div className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16162a] rounded-2xl p-10 border border-white/10 shadow-2xl">
                                    {/* Top Gradient Line */}
                                    <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

                                    {/* Label */}
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#1a1a2e] border border-white/10 rounded-full">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Question (Front)</span>
                                    </div>

                                    <h2 className="text-2xl md:text-3xl font-bold text-white leading-relaxed text-center pt-4">
                                        {activeCard.front_text}
                                    </h2>
                                </div>
                            </div>

                            {/* Decorative Separator */}
                            <div className="flex items-center justify-center gap-3 py-4">
                                <div className="w-12 h-px bg-gradient-to-r from-transparent to-slate-600" />
                                <div className="flex gap-1">
                                    <div className="w-1 h-1 rounded-full bg-slate-600" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                    <div className="w-1 h-1 rounded-full bg-slate-600" />
                                </div>
                                <div className="w-12 h-px bg-gradient-to-l from-transparent to-slate-600" />
                            </div>

                            {/* Answer Card - Revealed Style */}
                            <div className="relative">
                                <div className="bg-gradient-to-br from-[#0f0f1a] to-[#111118] rounded-2xl p-10 border border-white/5">
                                    {/* Label */}
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#0f0f1a] border border-white/10 rounded-full">
                                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Answer (Back)</span>
                                    </div>

                                    <p className="text-lg text-slate-300 leading-relaxed text-center pt-4">
                                        {activeCard.back_text}
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-center gap-4 pt-6">
                                <button
                                    onClick={() => navigate(`/flashcards/${id}/cards/${activeCard.id}/edit`)}
                                    className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-white font-medium transition-all hover:scale-105"
                                >
                                    <Edit3 size={16} />
                                    Edit
                                </button>
                                <button className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-white font-medium transition-all hover:scale-105">
                                    <History size={16} />
                                    History
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <EmptyState
                            title="No Card Selected"
                            description="Select a card from the list to view details."
                            icon={<BrainCircuit size={48} />}
                        />
                    )}
                </div>

                {/* RIGHT PANEL: Context Dock */}
                <ContextDock card={activeCard} allCards={cards || []} />
            </div>
        </div>
    );
}
