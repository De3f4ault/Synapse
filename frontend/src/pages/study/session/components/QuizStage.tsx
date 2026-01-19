/**
 * QuizStage - Quiz question rendering for study sessions
 * 
 * Single Responsibility: Render quiz content with proper layout and styling
 * 
 * Displays quiz questions in a card format consistent with the immersive experience.
 */

import { motion } from 'framer-motion';
import type { StudyItem } from '../../core/engine/types';

interface QuizStageProps {
  item: StudyItem;
}

export function QuizStage({ item }: QuizStageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-lg"
    >
      {/* Quiz Card */}
      <div className="bg-[#0A0A0A]/60 border border-white/10 rounded-3xl p-10 shadow-2xl backdrop-blur-sm">
        {/* Question Label */}
        <div className="text-center mb-6">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
            Question
          </span>
        </div>
        
        {/* Question Content */}
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center leading-relaxed">
          {item.title}
        </h2>
        
        {/* Hint/Description if available */}
        {item.rawData?.description && (
          <p className="mt-6 text-slate-400 text-center text-sm">
            {item.rawData.description}
          </p>
        )}
        
        {/* Tap to flip hint (if applicable) */}
        <div className="mt-8 text-center">
          <span className="text-xs text-slate-600 uppercase tracking-widest">
            Rate your answer below
          </span>
        </div>
      </div>
    </motion.div>
  );
}
