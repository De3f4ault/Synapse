/**
 * FlashcardStage - Flashcard rendering wrapper for study sessions
 * 
 * Single Responsibility: Render FlashcardView with proper layout and animations
 * 
 * Composes the FlashcardView from the flashcards module with session-specific styling.
 */

import { motion } from 'framer-motion';
import { FlashcardView } from '@/pages/flashcards/study';
import type { Flashcard } from '@/pages/flashcards/core';
import type { StudyItem } from '../../core/engine/types';

interface FlashcardStageProps {
  item: StudyItem;
  isFlipped: boolean;
  onFlip: () => void;
}

/**
 * Convert StudyItem to Flashcard format for FlashcardView component
 */
function toFlashcard(item: StudyItem): Flashcard | null {
  if (item.type !== 'flashcard' || !item.rawData) return null;
  
  return {
    id: item.id,
    deck_id: item.deckId || 0,
    front_text: item.rawData.front_text || item.title,
    back_text: item.rawData.back_text || '',
    learning_state: (item.rawData.learning_state || 'new') as Flashcard['learning_state'],
    front_media_url: item.rawData.front_media_url,
    back_media_url: item.rawData.back_media_url,
  };
}

export function FlashcardStage({ item, isFlipped, onFlip }: FlashcardStageProps) {
  const flashcard = toFlashcard(item);
  
  if (!flashcard) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Unable to load flashcard data
      </div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full h-full max-w-md max-h-[70vh] flex items-center justify-center"
    >
      <FlashcardView
        card={flashcard}
        isFlipped={isFlipped}
        onFlip={onFlip}
      />
    </motion.div>
  );
}
