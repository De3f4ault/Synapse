/**
 * SessionView - Main content renderer for study sessions
 * 
 * Single Responsibility: Render the current item's content based on its type
 * 
 * This is the main stage that displays either FlashcardStage or QuizStage
 * depending on the current item type.
 */

import { AnimatePresence } from 'framer-motion';
import { FlashcardStage } from './FlashcardStage';
import { QuizStage } from './QuizStage';
import type { StudyItem } from '../../core/engine/types';

interface SessionViewProps {
  item: StudyItem;
  isFlipped: boolean;
  onFlip: () => void;
}

export function SessionView({ item, isFlipped, onFlip }: SessionViewProps) {
  return (
    <div className="flex-1 w-full flex items-center justify-center pt-24 p-4 z-10">
      <AnimatePresence mode="wait">
        {item.type === 'flashcard' ? (
          <FlashcardStage
            key={item.id}
            item={item}
            isFlipped={isFlipped}
            onFlip={onFlip}
          />
        ) : (
          <QuizStage
            key={item.id}
            item={item}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
