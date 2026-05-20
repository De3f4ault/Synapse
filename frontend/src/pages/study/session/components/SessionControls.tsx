/**
 * SessionControls - Bottom control bar for study sessions
 * 
 * Single Responsibility: Render action buttons based on current item state
 * 
 * Displays appropriate controls:
 * - Flashcard (not flipped): "Reveal Answer" button
 * - Flashcard (flipped): SM-2 Rating Controls
 * - Quiz: Correct/Incorrect buttons
 */

import { motion, AnimatePresence } from 'framer-motion';
import { RatingControls } from '@/pages/flashcards/study';
import type { ReviewRating } from '@/pages/flashcards/core';
import type { StudyItemType } from '../../core/engine/types';

interface SessionControlsProps {
  itemType: StudyItemType;
  isFlipped: boolean;
  isPaused: boolean;
  onFlip: () => void;
  onRate: (rating: ReviewRating) => void;
  onAnswer: (isCorrect: boolean) => void;
  onSkip?: () => void;
}

export function SessionControls({
  itemType,
  isFlipped,
  isPaused,
  onFlip,
  onRate,
  onAnswer,
  onSkip: _onSkip,
}: SessionControlsProps) {
  return (
    <div className="h-32 flex items-center justify-center p-6 z-20">
      <AnimatePresence mode="wait">
        {itemType === 'flashcard' && isFlipped ? (
          // SM-2 Rating Controls (after flip)
          <motion.div
            key="rating-controls"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <RatingControls onRate={onRate} disabled={isPaused} />
          </motion.div>
        ) : itemType === 'flashcard' && !isFlipped ? (
          // Reveal Answer button (before flip)
          <motion.button
            key="reveal-button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onFlip}
            disabled={isPaused}
            className="px-8 py-4 rounded-full bg-foreground/5 border border-border text-foreground/80 font-medium hover:bg-muted transition-colors tracking-widest uppercase text-sm disabled:opacity-50"
          >
            Reveal Answer
          </motion.button>
        ) : (
          // Quiz controls (Correct/Incorrect)
          <motion.div
            key="quiz-controls"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex gap-4"
          >
            <button
              onClick={() => onAnswer(false)}
              disabled={isPaused}
              className="px-6 py-3 rounded-full bg-foreground/5 border border-border text-foreground/80 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors uppercase text-sm tracking-wider disabled:opacity-50"
            >
              Incorrect
            </button>
            <button
              onClick={() => onAnswer(true)}
              disabled={isPaused}
              className="px-6 py-3 rounded-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors uppercase text-sm tracking-wider disabled:opacity-50"
            >
              Correct
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
