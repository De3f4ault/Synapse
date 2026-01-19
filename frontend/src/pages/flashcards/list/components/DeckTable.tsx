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
        <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0f]">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-white/5 text-xs font-bold text-slate-500 uppercase tracking-wider">
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
                            className="grid grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer hover:bg-white/5 transition-colors group"
                        >
                            {/* Name */}
                            <div className="col-span-4">
                                <h3 className="font-medium text-white group-hover:text-cyan-400 transition-colors truncate">
                                    {deck.name}
                                </h3>
                                <p className="text-xs text-slate-500 truncate">
                                    {deck.description || 'No description'}
                                </p>
                            </div>

                            {/* Cards */}
                            <div className="col-span-2 flex items-center justify-center gap-1.5 text-slate-400">
                                <Layers size={14} />
                                <span className="text-sm">{deck.card_count || 0}</span>
                            </div>

                            {/* Mastery */}
                            <div className="col-span-2 flex items-center justify-center">
                                <span
                                    className={`text-sm font-bold ${mastery >= 70
                                            ? 'text-emerald-400'
                                            : mastery >= 50
                                                ? 'text-cyan-400'
                                                : mastery >= 30
                                                    ? 'text-amber-400'
                                                    : 'text-red-400'
                                        }`}
                                >
                                    {mastery}%
                                </span>
                            </div>

                            {/* Due */}
                            <div className="col-span-2 flex items-center justify-center gap-1.5 text-amber-400">
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
                                    className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                                    title="Review"
                                >
                                    <Play size={14} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeckEdit(deck.id);
                                    }}
                                    className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                                    title="Edit"
                                >
                                    <Edit size={14} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeckDelete(deck.id);
                                    }}
                                    className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
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
