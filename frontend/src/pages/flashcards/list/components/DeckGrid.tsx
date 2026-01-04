/**
 * DeckGrid Component
 * 
 * Grid layout for displaying deck cards with stagger animation.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { DeckCard } from './DeckCard';
import type { Deck } from '../../core';

interface DeckGridProps {
    decks: Deck[];
    onDeckClick: (deckId: number) => void;
    onDeckDelete: (deckId: number) => void;
    onDeckEdit: (deckId: number) => void;
    onDeckReview: (deckId: number) => void;
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.3,
            ease: 'easeOut',
        },
    },
};

/**
 * Calculate estimated mastery based on card count.
 * In production, this should come from the API.
 */
function estimateMastery(deck: Deck): number {
    const count = deck.card_count || 0;
    if (count === 0) return 0;
    if (count < 10) return 15;
    if (count < 50) return 35;
    if (count < 100) return 55;
    return 70;
}

export function DeckGrid({
    decks,
    onDeckClick,
    onDeckDelete,
    onDeckEdit,
    onDeckReview,
}: DeckGridProps) {
    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 w-full"
        >
            <AnimatePresence mode="popLayout">
                {decks.map((deck) => (
                    <motion.div
                        key={deck.id}
                        variants={itemVariants}
                        layout
                        exit={{ opacity: 0, scale: 0.95 }}
                    >
                        <DeckCard
                            deck={deck}
                            masteryPercent={estimateMastery(deck)}
                            dueCount={Math.min(deck.card_count || 0, 10)}
                            onClick={() => onDeckClick(deck.id)}
                            onDelete={() => onDeckDelete(deck.id)}
                            onEdit={() => onDeckEdit(deck.id)}
                            onReview={() => onDeckReview(deck.id)}
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </motion.div>
    );
}
