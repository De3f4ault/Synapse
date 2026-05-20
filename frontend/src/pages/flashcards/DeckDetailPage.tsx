/**
 * DeckDetailPage - "Learning Cockpit" (V4)
 * 
 * A 3-panel intelligent study interface:
 * - Left: Card List with Learning State indicators
 * - Center: Knowledge Focus Zone with Stats Bar
 * - Right: Context Dock (Related Cards, Card Stats)
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Play,
    Clock,
    Search,
    Edit3,
    BrainCircuit,
    Calendar,
    TrendingUp,
    ChevronRight,
    BarChart3,
    Zap,
    Repeat,
    Download,
    Upload,
    FileJson,
    FileSpreadsheet,
    ChevronDown,
    BookOpen,
    Target,
    Sparkles,
} from 'lucide-react';
import { MarkdownRenderer } from '@/shared/rendering';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { FlashcardsService, AnalyticsService } from '@/api/generated';
import { cn } from '@/lib/utils';
import { useExportDeckJSON, useExportDeckCSV, useImportDeckCSV } from '@/api/hooks/useFlashcards';
import { toast } from 'sonner';

// Core Imports
import { useDeck } from './list';
import { useActiveDeck, type Flashcard, type LearningState } from './core';
import { CardTutorPanel } from './study';
import { DeckAnalyticsTab } from './components/DeckAnalyticsTab';

// Shared
import { EmptyState } from '@/shared/ui';
import { GlassCard } from "@/shared/ui";

// ----------------------------------------------------------------------
// TYPES & HELPERS
// ----------------------------------------------------------------------

const STATE_CONFIG: Record<LearningState, { color: string; label: string; dotColor: string }> = {
    new: { color: 'text-muted-foreground', label: 'New', dotColor: 'bg-slate-500' },
    learning: { color: 'text-warning', label: 'Learning', dotColor: 'bg-amber-400' },
    review: { color: 'text-primary', label: 'Review', dotColor: 'bg-primary' },
    mastered: { color: 'text-accent-olive', label: 'Mastered', dotColor: 'bg-accent-olive' },
};

/**
 * Smart Next Review display:
 * - Past date → "Overdue" (red)
 * - Today → "Due today" (amber)
 * - Future → formatted date (cyan)
 * - null → "Now" (cyan)
 */
function formatNextReview(nextReview: string | null | undefined): { text: string; color: string } {
    if (!nextReview) return { text: 'Now', color: 'text-primary' };

    const reviewDate = new Date(nextReview);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const reviewDay = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());

    const diffDays = Math.floor((reviewDay.getTime() - today.getTime()) / 86400000);

    if (diffDays < 0) {
        return { text: `Overdue (${Math.abs(diffDays)}d)`, color: 'text-destructive' };
    }
    if (diffDays === 0) {
        return { text: 'Due today', color: 'text-warning' };
    }
    if (diffDays === 1) {
        return { text: 'Tomorrow', color: 'text-primary' };
    }
    return {
        text: reviewDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        color: 'text-primary',
    };
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

    return (
        <motion.div
            layout
            onClick={onClick}
            className={cn(
                "group p-3 rounded-xl cursor-pointer transition-all duration-200 border",
                active
                    ? "bg-foreground/5 border-primary/30 shadow-[0_0_20px_rgba(6,182,212,0.1)]"
                    : "bg-transparent border-transparent hover:bg-muted/50 hover:border-border"
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
                        active ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
                    )}>
                        {card.front_text}
                    </p>

                    {/* Review count instead of mock spark chart */}
                    {(card.times_reviewed ?? 0) > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Repeat size={10} />
                            <span>{card.times_reviewed}× reviewed</span>
                        </div>
                    )}
                </div>

                {active && <ChevronRight className="w-4 h-4 text-primary mt-1 flex-shrink-0" />}
            </div>
        </motion.div>
    );
}

// ----------------------------------------------------------------------
// RIGHT PANEL: Context Dock
// ----------------------------------------------------------------------

function ContextDock({
  card,
  deckId,
  onOpenTutor,
}: {
  card: Flashcard | undefined;
  deckId: number;
  onOpenTutor?: (cardId: number) => void;
}) {
    const easeFactor    = card?.ease_factor ?? 2.5;
    const interval      = card?.interval ?? 0;
    const repetitions   = card?.repetitions ?? 0;
    const timesReviewed = card?.times_reviewed ?? 0;
    const nextReview    = card ? formatNextReview(card.next_review) : null;

    // Recall rate: prefer accuracy field, fall back to null with no-data label
    const recallRate = card?.accuracy != null
      ? card.accuracy
      : null;
    const recallLabel = recallRate != null
      ? `${(recallRate * 100).toFixed(0)}%`
      : timesReviewed === 0 ? 'No data' : '—';
    const recallColor = recallRate == null
      ? 'text-muted-foreground'
      : recallRate >= 0.8 ? 'text-accent-olive'
      : recallRate >= 0.5 ? 'text-warning'
      : 'text-destructive';

    // Deck-level analytics (projected mastery)
    const { data: analytics } = useQuery({
      queryKey: ['deck-analytics', deckId],
      queryFn: () => AnalyticsService.getDeckAnalyticsApiV1CollectionsDecksDeckIdAnalyticsGet(deckId),
      enabled: !!deckId,
      staleTime: 5 * 60_000,
    });

    const projectedMastery: string | null = analytics?.projected_mastery_date ?? null;
    const masteryLabel = projectedMastery
      ? new Date(projectedMastery).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : null;

    return (
        <div className="w-64 flex-shrink-0 border-l border-border bg-background/50 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-border">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <BarChart3 size={12} className="text-accent" />
                    Card Stats
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide space-y-4">
                {card ? (
                    <>
                    <GlassCard className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ease</p>
                                <p className="text-sm font-bold text-foreground">{easeFactor.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Interval</p>
                                <p className="text-sm font-bold text-foreground">{interval}d</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reviews</p>
                                <p className="text-sm font-bold text-foreground">{timesReviewed}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Recall Rate</p>
                                <p className={cn("text-sm font-bold", recallColor)}>{recallLabel}</p>
                            </div>
                        </div>

                        {/* Repetitions */}
                        <div className="pt-2 border-t border-border">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Repetitions</span>
                                <span className="text-xs font-bold text-foreground">{repetitions}</span>
                            </div>
                        </div>

                        {/* Next Review */}
                        {nextReview && (
                            <div className="pt-2 border-t border-border">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Next Review</span>
                                    <span className={cn("text-xs font-bold", nextReview.color)}>{nextReview.text}</span>
                                </div>
                            </div>
                        )}

                        {/* Strength label */}
                        {timesReviewed > 0 && recallRate != null && (
                            <div className="pt-2 border-t border-border">
                                <div className="flex items-center gap-2">
                                    <Zap size={12} className={recallColor} />
                                    <span className="text-xs text-muted-foreground">
                                        {recallRate >= 0.8 ? 'Strong recall' : recallRate >= 0.5 ? 'Building up' : 'Needs more practice'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </GlassCard>

                    {/* Projected Mastery (deck-level) */}
                    {masteryLabel && (
                        <GlassCard className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Target size={12} className="text-primary" />
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Projected Mastery</span>
                            </div>
                            <p className="text-sm font-bold text-primary">{masteryLabel}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Estimated via SM-2 projection</p>
                        </GlassCard>
                    )}

                    {/* Open Card Tutor */}
                    {onOpenTutor && (
                        <button
                            onClick={() => onOpenTutor(card.id)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/5 transition-colors"
                        >
                            <BookOpen size={13} />
                            Ask Card Tutor
                        </button>
                    )}
                    </>
                ) : (
                    <p className="text-xs text-muted-foreground mt-2">Select a card to see its SM-2 stats.</p>
                )}
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// MAIN PAGE COMPONENT
// ----------------------------------------------------------------------

const LEARNING_STATE_FILTERS = [
    { label: 'All', value: null },
    { label: 'New', value: 'new' as LearningState },
    { label: 'Learning', value: 'learning' as LearningState },
    { label: 'Review', value: 'review' as LearningState },
    { label: 'Mastered', value: 'mastered' as LearningState },
] as const;

export function DeckDetailPage() {
    const { deckId } = useParams<{ deckId: string }>();
    const navigate = useNavigate();
    const id = parseInt(deckId || '0', 10);

    // Selected Card State
    const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery]         = useState('');
    const [exportMenuOpen, setExportMenuOpen]   = useState(false);
    const [stateFilter, setStateFilter]         = useState<LearningState | null>(null);
    const [tutorCardId, setTutorCardId]         = useState<number | null>(null);
    const [activeTab, setActiveTab]             = useState<'cards' | 'analytics'>('cards');

    // Sync with Core
    useActiveDeck({ deckId: id });

    // Queries
    const { data: deck, isLoading: deckLoading } = useDeck(id);
    const { data: cardsResponse, isLoading: cardsLoading } = useQuery({
        queryKey: queryKeys.decks.cards(id),
        queryFn: () => FlashcardsService.listDeckCardsApiV1DecksDeckIdCardsGet(id),
        enabled: !!id,
    });

    // Export / Import hooks
    const { refetch: fetchExportJSON } = useExportDeckJSON(id);
    const exportCSV = useExportDeckCSV();
    const importCSV = useImportDeckCSV();

    const cards = useMemo(() => cardsResponse as Flashcard[] | undefined, [cardsResponse]);

    // Derived State
    const activeCard = useMemo(() =>
        cards?.find(c => c.id === selectedCardId) || cards?.[0],
        [cards, selectedCardId]
    );

    const filteredCards = useMemo(() => {
        if (!cards) return [];
        let result = cards;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(c =>
                c.front_text.toLowerCase().includes(q) ||
                c.back_text.toLowerCase().includes(q)
            );
        }
        if (stateFilter) {
            result = result.filter(c => c.learning_state === stateFilter);
        }
        return result;
    }, [cards, searchQuery, stateFilter]);

    // Stats
    const masteredCount = cards?.filter(c => c.learning_state === 'mastered').length || 0;
    const masteryPercent = cards?.length ? Math.round((masteredCount / cards.length) * 100) : 0;

    // Next review display for active card
    const nextReview = activeCard ? formatNextReview(activeCard.next_review) : null;

    // Export Handlers
    const handleExportJSON = async () => {
        setExportMenuOpen(false);
        try {
            const { data: exportData } = await fetchExportJSON();
            if (!exportData) return;
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${deck?.name || 'deck'}_export.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('Deck exported as JSON');
        } catch {
            toast.error('Failed to export deck');
        }
    };

    const handleExportCSV = () => {
        setExportMenuOpen(false);
        exportCSV.mutate(id, {
            onSuccess: () => toast.success('Deck exported as CSV'),
            onError: () => toast.error('Failed to export CSV'),
        });
    };

    const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        importCSV.mutate(
            { deckId: id, file },
            {
                onSuccess: (result) => {
                    toast.success(`Imported ${result.imported} cards`, {
                        description: result.skipped_duplicates
                            ? `${result.skipped_duplicates} duplicates skipped`
                            : undefined,
                    });
                },
                onError: () => toast.error('Failed to import CSV'),
            },
        );
        // Reset input
        e.target.value = '';
    };

    // Loading / Error States
    if (deckLoading || cardsLoading) {
        return (
            <div className="fixed inset-0 min-h-screen bg-background text-foreground flex items-center justify-center">
                <div className="text-muted-foreground text-sm">Loading deck...</div>
            </div>
        );
    }
    if (!deck) return <EmptyState title="Deck not found" />;

    return (
        <>
        <div className="fixed inset-0 min-h-screen bg-background text-foreground flex flex-col pt-16">

            {/* HEADER */}
            <div className="flex-none h-14 px-6 border-b border-border bg-background/70 backdrop-blur-xl flex items-center justify-between z-20">
                {/* Left: Back + Title */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/flashcards')}
                        className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Card Deck:</span>
                            <h1 className="text-sm font-bold text-foreground">{deck.name}</h1>
                        </div>
                    </div>
                </div>

                {/* Center: Stats Bar */}
                {activeCard && (
                    <div className="hidden md:flex items-center gap-8 px-6 py-2 rounded-xl bg-foreground/5 border border-border">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={14} className="text-accent-olive" />
                            <span className="text-xs text-muted-foreground">Recall Rate:</span>
                            <span className={cn(
                              "text-xs font-bold",
                              activeCard.accuracy == null ? 'text-muted-foreground'
                              : activeCard.accuracy >= 0.8 ? 'text-accent-olive'
                              : activeCard.accuracy >= 0.5 ? 'text-warning' : 'text-destructive'
                            )}>
                              {activeCard.accuracy != null
                                ? `${(activeCard.accuracy * 100).toFixed(0)}%`
                                : (activeCard.times_reviewed ?? 0) === 0 ? 'No data' : '—'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock size={14} className="text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Last Reviewed:</span>
                            <span className="text-xs font-bold text-foreground">
                                {activeCard.last_review ? `${Math.floor((Date.now() - new Date(activeCard.last_review).getTime()) / 86400000)} days ago` : 'Never'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className={nextReview?.color || 'text-primary'} />
                            <span className="text-xs text-muted-foreground">Next Review:</span>
                            <span className={cn("text-xs font-bold", nextReview?.color || 'text-primary')}>
                                {nextReview?.text || 'Now'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {/* Export / Import Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setExportMenuOpen(!exportMenuOpen)}
                            className="flex items-center gap-1.5 p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                            title="Export / Import"
                        >
                            <Download size={18} />
                            <ChevronDown size={12} />
                        </button>

                        {exportMenuOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setExportMenuOpen(false)}
                                />
                                <div className="absolute right-0 top-full mt-1 w-52 py-1.5 bg-popover backdrop-blur-xl border border-border rounded-xl shadow-2xl z-50">
                                    <button
                                        onClick={handleExportJSON}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
                                    >
                                        <FileJson size={15} className="text-primary" />
                                        Export as JSON
                                    </button>
                                    <button
                                        onClick={handleExportCSV}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
                                    >
                                        <FileSpreadsheet size={15} className="text-accent-olive" />
                                        Export as CSV
                                    </button>
                                    <div className="my-1 border-t border-border" />
                                    <label className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer">
                                        <Upload size={15} className="text-warning" />
                                        Import CSV
                                        <input
                                            type="file"
                                            accept=".csv"
                                            className="hidden"
                                            onChange={handleImportCSV}
                                        />
                                    </label>
                                </div>
                            </>
                        )}
                    </div>

                    <button
                        onClick={() => navigate(`/flashcards/${id}/ai-design`)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary/30 bg-primary/8 hover:bg-primary/15 text-primary text-sm font-medium transition-all"
                        title="AI Card Designer — conversation-first card creation"
                    >
                        <Sparkles size={14} />
                        AI Design
                    </button>

                    <button
                        onClick={() => navigate(`/flashcards/${id}/review`)}
                        className="flex items-center gap-2 px-5 py-2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm transition-all"
                    >
                        <Play size={14} fill="currentColor" />
                        Start Session
                    </button>
                </div>
            </div>

            {/* MAIN 3-PANEL LAYOUT */}
            <div className="flex-1 overflow-hidden flex">

                {/* LEFT PANEL: Tab + Card List */}
                <div className="w-80 flex-shrink-0 border-r border-border bg-background/50 flex flex-col">

                    {/* Tab Switcher */}
                    <div className="flex border-b border-border shrink-0">
                        <button
                            onClick={() => setActiveTab('cards')}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors',
                                activeTab === 'cards'
                                    ? 'border-b-2 border-primary text-primary bg-primary/5'
                                    : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <BrainCircuit size={12} />
                            Cards
                            {cards && (
                                <span className="ml-0.5 px-1 py-0.5 rounded-full bg-foreground/10 text-[9px]">{cards.length}</span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors',
                                activeTab === 'analytics'
                                    ? 'border-b-2 border-primary text-primary bg-primary/5'
                                    : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <BarChart3 size={12} />
                            Analytics
                        </button>
                    </div>


                    {activeTab === 'cards' && (
                        <>
                            <div className="p-4 border-b border-border space-y-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search questions..."
                                        className="w-full pl-10 pr-4 py-2.5 bg-card/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
                                    />
                                </div>
                                {/* Learning State Filters */}
                                <div className="flex flex-wrap gap-1.5">
                                    {LEARNING_STATE_FILTERS.map(({ label, value }) => {
                                        const isActive = stateFilter === value;
                                        const dotColor = value ? STATE_CONFIG[value].dotColor : 'bg-foreground/30';
                                        return (
                                            <button
                                                key={label}
                                                onClick={() => setStateFilter(value)}
                                                className={cn(
                                                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border',
                                                    isActive
                                                        ? 'bg-foreground/10 border-primary/40 text-foreground'
                                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                                )}
                                            >
                                                <span className={cn('w-1.5 h-1.5 rounded-full', dotColor)} />
                                                {label}
                                                {value && cards && (
                                                    <span className="text-muted-foreground">
                                                        {cards.filter(c => c.learning_state === value).length}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
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
                            <div className="p-4 border-t border-border bg-card/50">
                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                                    <span>Deck Progress:</span>
                                    <span className="font-bold text-foreground">{masteryPercent}% Mastered</span>
                                </div>
                                <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-primary to-accent-olive"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${masteryPercent}%` }}
                                        transition={{ duration: 0.5, ease: 'easeOut' }}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Analytics Tab */}
                    {activeTab === 'analytics' && (
                        <div className="flex-1 overflow-y-auto">
                            <DeckAnalyticsTab
                                deckId={id}
                                onOpenTutor={(cardId) => setTutorCardId(cardId)}
                            />
                        </div>
                    )}
                </div>

                {/* CENTER PANEL: Knowledge Focus Zone */}
                <div className="flex-1 bg-background relative overflow-hidden flex flex-col items-center justify-center p-8">
                    {activeCard ? (
                        <motion.div
                            className="w-full max-w-2xl space-y-6"
                            key={activeCard.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Question Card */}
                            <div className="relative">
                                <div className="bg-card rounded-2xl p-10 border border-border shadow-2xl">
                                    <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-card border border-border rounded-full">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Question (Front)</span>
                                    </div>
                                    <div className="pt-4">
                                        <MarkdownRenderer
                                            content={activeCard.front_text}
                                            className="[&_p]:text-center [&_h1]:text-center [&_h2]:text-center [&_h3]:text-center [&_.katex-display]:text-center [&_p]:text-lg [&_p]:font-semibold [&_p]:text-foreground"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Separator */}
                            <div className="flex items-center justify-center gap-3 py-4">
                                <div className="w-12 h-px bg-gradient-to-r from-transparent to-border" />
                                <div className="flex gap-1">
                                    <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                                    <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                                </div>
                                <div className="w-12 h-px bg-gradient-to-l from-transparent to-border" />
                            </div>

                            {/* Answer Card */}
                            <div className="relative">
                                <div className="bg-card rounded-2xl p-10 border border-border">
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-card border border-border rounded-full">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Answer (Back)</span>
                                    </div>
                                    <div className="pt-4">
                                        <MarkdownRenderer
                                            content={activeCard.back_text}
                                            className="[&_p]:text-center [&_h1]:text-center [&_h2]:text-center [&_h3]:text-center [&_.katex-display]:text-center [&_p]:text-foreground/80"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-center gap-4 pt-6">
                                <button
                                    onClick={() => navigate(`/flashcards/${id}/cards/${activeCard.id}/edit`)}
                                    className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground font-medium transition-all hover:scale-105"
                                >
                                    <Edit3 size={16} />
                                    Edit Card
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

                {/* RIGHT PANEL: swaps between Card Stats ↔ Card Tutor */}
                {tutorCardId ? (
                    <div className="w-[420px] flex-shrink-0 border-l border-border flex flex-col overflow-hidden">
                        <CardTutorPanel
                            cardId={tutorCardId}
                            cardFront={cards?.find(c => c.id === tutorCardId)?.front_text}
                            cardBack={cards?.find(c => c.id === tutorCardId)?.back_text}
                            onClose={() => setTutorCardId(null)}
                        />
                    </div>
                ) : (
                    <ContextDock
                        card={activeCard}
                        deckId={id}
                        onOpenTutor={(cardId) => setTutorCardId(cardId)}
                    />
                )}
            </div>
        </div>

    </>
    );
}
