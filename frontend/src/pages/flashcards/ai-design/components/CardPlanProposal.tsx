/**
 * CardPlanProposal — right-panel proposal display.
 *
 * Renders the AI designer's proposed card plan with:
 *  - Subtopic rows with interactive count ± controls
 *  - Full difficulty_note as rationale text per subtopic
 *  - Coloured style badges with icons
 *  - AI rationale callout (💡 Why this plan)
 *  - Source material indicator
 *  - Generate CTA
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, BookOpen, Brain, MessageSquare, Repeat2,
    CheckCircle2, Loader2, ChevronRight, Lightbulb, Minus, Plus,
    ExternalLink, PlusCircle,
} from 'lucide-react';
import type { CardDesignPlan, SubtopicSpec } from '../hooks/useCardDesignChat';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface GeneratedResult {
    deck_id: number;
    deck_name: string;
    cards_generated: number;
}

interface CardPlanProposalProps {
    plan: CardDesignPlan | null;
    isGenerating: boolean;
    onAccept: () => void;
    onAdjust?: (patch: Partial<CardDesignPlan>) => void;
    generatedResult?: GeneratedResult | null;
    onDesignMore?: () => void;
}

// ─── Style metadata ───────────────────────────────────────────────────────────

const STYLE_META: Record<string, { label: string; icon: React.ReactNode; color: string; dot: string }> = {
    basic:    { label: 'Recall',    icon: <BookOpen className="h-3 w-3" />,      color: 'bg-blue-500/12 text-blue-400 border-blue-500/25',      dot: 'bg-blue-400' },
    cloze:    { label: 'Fill-in',   icon: <Repeat2 className="h-3 w-3" />,       color: 'bg-violet-500/12 text-violet-400 border-violet-500/25', dot: 'bg-violet-400' },
    socratic: { label: 'Reasoning', icon: <Brain className="h-3 w-3" />,         color: 'bg-amber-500/12 text-amber-400 border-amber-500/25',    dot: 'bg-amber-400' },
    scenario: { label: 'Scenario',  icon: <MessageSquare className="h-3 w-3" />, color: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25', dot: 'bg-emerald-400' },
};

const DEFAULT_META = STYLE_META['basic']!;

function StyleBadge({ style }: { style: string }) {
    const meta = STYLE_META[style] ?? DEFAULT_META;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${meta.color}`}>
            {meta.icon}
            {meta.label}
        </span>
    );
}

// ─── Subtopic row ─────────────────────────────────────────────────────────────

interface SubtopicRowProps {
    spec: SubtopicSpec;
    index: number;
    onCountChange?: (index: number, delta: number) => void;
}

function SubtopicRow({ spec, index, onCountChange }: SubtopicRowProps) {
    const meta = STYLE_META[spec.style] ?? DEFAULT_META;
    return (
        <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-xl bg-foreground/[0.03] border border-border/50 overflow-hidden"
        >
            {/* Top row: dot, name, badge, count */}
            <div className="flex items-start gap-2.5 px-3 pt-3 pb-2">
                <div className={cn('w-2 h-2 rounded-full mt-1 shrink-0', meta.dot)} />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug">{spec.topic}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <StyleBadge style={spec.style} />
                </div>
            </div>

            {/* Difficulty note */}
            {spec.difficulty_note && (
                <p className="text-[11px] text-muted-foreground leading-relaxed px-3 pb-2 pl-[26px]">
                    {spec.difficulty_note}
                </p>
            )}

            {/* Count adjustment row */}
            <div className="flex items-center justify-between px-3 pb-3 pl-[26px]">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Cards</span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onCountChange?.(index, -1)}
                        disabled={spec.count <= 1}
                        className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 transition-colors"
                    >
                        <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm font-semibold text-foreground w-6 text-center tabular-nums">
                        {spec.count}
                    </span>
                    <button
                        onClick={() => onCountChange?.(index, 1)}
                        disabled={spec.count >= 50}
                        className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 transition-colors"
                    >
                        <Plus className="h-3 w-3" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-full gap-6 px-6 text-center">
            <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-primary/60" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                    <span className="text-[9px] text-muted-foreground font-bold">?</span>
                </div>
            </div>
            <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Plan will appear here</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    Chat with the AI designer. Once it has enough context, it will propose a card plan — subtopics, styles, and card count — right here.
                </p>
            </div>
            <div className="w-full space-y-2">
                {['Tell it what you want to learn', 'Share your level and goals', 'Paste source material if you have it'].map((hint) => (
                    <div key={hint} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ChevronRight className="h-3 w-3 text-primary/50 shrink-0" />
                        <span>{hint}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CardPlanProposal({ plan, isGenerating, onAccept, onAdjust, generatedResult, onDesignMore }: CardPlanProposalProps) {
    const isDone = !!generatedResult;

    // Recompute total from current subtopic counts on every adjustment
    const handleCountChange = (index: number, delta: number) => {
        if (!plan || !onAdjust) return;
        const updated = plan.subtopics.map((s, i) =>
            i === index ? { ...s, count: Math.max(1, Math.min(50, s.count + delta)) } : s
        );
        onAdjust({
            subtopics: updated,
            total_cards: updated.reduce((sum, s) => sum + s.count, 0),
        });
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="shrink-0 px-5 pt-5 pb-4 border-b border-border/50">
                <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground">Card Plan</span>
                </div>
                {plan && (
                    <h2 className="text-base font-bold text-foreground leading-tight">{plan.deck_name}</h2>
                )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
                <AnimatePresence mode="wait">
                    {!plan ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full"
                        >
                            <EmptyState />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="plan"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            {/* Summary stats */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-primary/8 border border-primary/20 text-center">
                                    <div className="text-2xl font-bold text-primary tabular-nums">{plan.total_cards}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Cards</div>
                                </div>
                                <div className="p-3 rounded-xl bg-foreground/5 border border-border/50 text-center">
                                    <div className="text-2xl font-bold text-foreground tabular-nums">{plan.subtopics.length}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Topics</div>
                                </div>
                            </div>

                            {/* Objective badge */}
                            {plan.learning_objective && (
                                <div className="px-3 py-2 rounded-lg bg-foreground/5 border border-border/50">
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Objective: </span>
                                    <span className="text-xs font-medium text-foreground capitalize">
                                        {plan.learning_objective.replace(/_/g, ' ')}
                                    </span>
                                </div>
                            )}

                            {/* Subtopics with interactive count */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Subtopics</p>
                                 {plan.subtopics.map((spec, i) => (
                                    <SubtopicRow
                                        key={i}
                                        spec={spec}
                                        index={i}
                                        onCountChange={!isDone && onAdjust ? handleCountChange : undefined}
                                    />
                                ))}
                            </div>

                            {/* Rationale callout */}
                            {plan.rationale && (
                                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                                        <p className="text-[10px] font-mono uppercase tracking-wider text-amber-400/80">Why this plan</p>
                                    </div>
                                    <p className="text-xs text-foreground/80 leading-relaxed">{plan.rationale}</p>
                                </div>
                            )}

                            {/* Source material indicator */}
                            {plan.source_material && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/8 border border-emerald-500/20">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                    <span className="text-xs text-emerald-400">Grounded in your source material</span>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer — CTA (state machine) */}
            {plan && (
                <div className="shrink-0 px-5 py-4 border-t border-border/50">
                    <AnimatePresence mode="wait">

                        {/* ── State: DONE ───────────────────────────────── */}
                        {isDone ? (
                            <motion.div
                                key="done"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className="space-y-2"
                            >
                                {/* Success badge */}
                                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-emerald-400">
                                            {generatedResult!.cards_generated} cards generated
                                        </p>
                                        <p className="text-[10px] text-emerald-400/70 truncate">
                                            Added to &quot;{generatedResult!.deck_name}&quot;
                                        </p>
                                    </div>
                                </div>

                                {/* View Deck */}
                                <a
                                    href={`/flashcards/${generatedResult!.deck_id}`}
                                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    View Deck
                                </a>

                                {/* Design More */}
                                <button
                                    onClick={onDesignMore}
                                    className="w-full py-2 rounded-xl border border-border/60 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors flex items-center justify-center gap-2"
                                >
                                    <PlusCircle className="h-3.5 w-3.5" />
                                    Design more cards
                                </button>
                            </motion.div>

                        ) : (
                            <motion.div
                                key="generate"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className="space-y-2"
                            >
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onAccept}
                                    disabled={isGenerating}
                                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Generating cards…
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="h-4 w-4" />
                                            Generate {plan.total_cards} Cards
                                        </>
                                    )}
                                </motion.button>
                                <p className="text-[10px] text-muted-foreground text-center">
                                    Adjust counts above · ask AI to change styles
                                </p>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
