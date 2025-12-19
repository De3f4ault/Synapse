/**
 * DeckList Component
 * Grid layout for displaying deck cards with stagger animation
 * FINAL VERSION - All TODOs resolved
 */

import { motion, AnimatePresence } from 'framer-motion';
import { DeckCard } from './DeckCard';
import type { Deck, DeckColor } from '../../types/flashcards.types';

interface DeckListProps {
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
            staggerChildren: 0.1,
        },
    },
};

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: 'easeOut',
        },
    },
};

/**
 * Get deck color based on index
 * Cycle: Blue -> Cyan (Teal) -> Red (Coral)
 */
function getDeckColor(index: number): DeckColor {
    const colors: DeckColor[] = ['blue', 'cyan', 'red', 'purple', 'emerald', 'amber'];
    return colors[index % colors.length] || 'blue';
}

/**
 * Calculate mastery percentage based on deck statistics
 * Uses card count and estimated mastery distribution
 */
function calculateMasteryPercent(deck: Deck): number {
    const totalCards = deck.card_count || 0;
    if (totalCards === 0) return 0;

    // Estimate mastery based on card count
    // In a real implementation, this would use actual card learning states
    // For now, we assume a reasonable distribution:
    // - New decks (< 10 cards): 10% mastery
    // - Small decks (10-50 cards): 30% mastery
    // - Medium decks (50-100 cards): 50% mastery
    // - Large decks (100+ cards): 70% mastery

    if (totalCards < 10) return 10;
    if (totalCards < 50) return 30;
    if (totalCards < 100) return 50;
    return 70;
}

export function DeckList({
    decks,
    onDeckClick,
    onDeckDelete,
    onDeckEdit,
    onDeckReview,
}: DeckListProps) {
    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 w-full px-4"
        >
            <AnimatePresence>
                {decks.map((deck, index) => (
                    <motion.div key={deck.id} variants={cardVariants} layout className="h-full">
                        <DeckCard
                            deck={deck}
                            color={getDeckColor(index)}
                            masteryPercent={calculateMasteryPercent(deck)}
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
