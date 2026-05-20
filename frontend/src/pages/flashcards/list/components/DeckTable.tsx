/**
 * DeckTable Component
 * 
 * Table layout for displaying decks in list view.
 */

import { motion } from 'framer-motion';
import { Edit, Trash2, Play, Layers, Zap } from 'lucide-react';
import type { Deck } from '../../core';

interface DeckTableProps {
    decks: Deck[];
    onDeckClick: (deckId: number) => void;
    onDeckDelete: (deckId: number) => void;
    onDeckEdit: (deckId: number) => void;
    onDeckReview: (deckId: number) => void;
}

function estimateMastery(deck: Deck): number {
    const count = deck.card_count || 0;
    if (count === 0) return 0;
    if (count < 10) return 15;
    if (count < 50) return 35;
    if (count < 100) return 55;
    return 70;
}

export function DeckTable({
    decks,
    onDeckClick,
    onDeckDelete,
    onDeckEdit,
    onDeckReview,
}: DeckTableProps) {
    return (
        <div className="w-full overflow-hidden rounded-xl border border-border bg-popover">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-foreground/5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <div className="col-span-4">Name</div>
                <div className="col-span-2 text-center">Cards</div>
                <div className="col-span-2 text-center">Mastery</div>
                <div className="col-span-2 text-center">Due</div>
                <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/5">
                {decks.map((deck, index) => {
                    const mastery = estimateMastery(deck);
                    const dueCount = deck.due_count ?? 0;

                    return (
                        <motion.div
                            key={deck.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => onDeckClick(deck.id)}
                            className="grid grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer hover:bg-muted/50 transition-colors group"
                        >
                            {/* Name */}
                            <div className="col-span-4">
                                <h3 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                    {deck.name}
                                </h3>
                                <p className="text-xs text-muted-foreground truncate">
                                    {deck.description || 'No description'}
                                </p>
                            </div>

                            {/* Cards */}
                            <div className="col-span-2 flex items-center justify-center gap-1.5 text-muted-foreground">
                                <Layers size={14} />
                                <span className="text-sm">{deck.card_count || 0}</span>
                            </div>

                            {/* Mastery */}
                            <div className="col-span-2 flex items-center justify-center">
                                <span
                                    className={`text-sm font-bold ${mastery >= 70
                                            ? 'text-accent-olive'
                                            : mastery >= 50
                                                ? 'text-primary'
                                                : mastery >= 30
                                                    ? 'text-warning'
                                                    : 'text-destructive'
                                        }`}
                                >
                                    {mastery}%
                                </span>
                            </div>

                            {/* Due */}
                            <div className="col-span-2 flex items-center justify-center gap-1.5 text-warning">
                                <Zap size={14} />
                                <span className="text-sm">{dueCount}</span>
                            </div>

                            {/* Actions */}
                            <div className="col-span-2 flex items-center justify-end gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeckReview(deck.id);
                                    }}
                                    className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                    title="Review"
                                >
                                    <Play size={14} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeckEdit(deck.id);
                                    }}
                                    className="p-2 rounded-lg bg-foreground/5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                    title="Edit"
                                >
                                    <Edit size={14} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeckDelete(deck.id);
                                    }}
                                    className="p-2 rounded-lg bg-foreground/5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
