/**
 * CardFlip Component
 * 3D flip animation for flashcard review - Neumorphic Style
 */

import { motion } from "framer-motion";
import { Brain, Zap } from "lucide-react";
import type { Flashcard } from "../../types/flashcards.types";

interface CardFlipProps {
  card: Flashcard;
  isFlipped: boolean;
  onFlip: () => void;
}

export function CardFlip({ card, isFlipped, onFlip }: CardFlipProps) {
  return (
    <div
      className="w-full h-full cursor-pointer" // Changed aspect-ratio handling to parent
      style={{ perspective: "1200px" }}
      onClick={onFlip}
    >
      <motion.div
        className="w-full h-full relative"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
      >
        {/* FRONT */}
        <div
          className="absolute inset-0 rounded-3xl nm-card flex flex-col items-center justify-center p-12 text-center overflow-hidden border border-white/5"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="absolute top-8 left-8 text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Brain size={14} className="text-cyan-500" />
            Query
          </div>

          <h2 className="text-3xl md:text-5xl font-bold text-slate-200 leading-tight">
            {card.front_text}
          </h2>

          <div className="absolute bottom-8 text-[10px] font-mono text-slate-600 animate-pulse uppercase tracking-[0.2em]">
            Click to Reveal
          </div>
        </div>

        {/* BACK */}
        <div
          className="absolute inset-0 rounded-3xl nm-card flex flex-col items-center justify-center p-12 text-center overflow-hidden border border-purple-500/20"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />

          <div className="absolute top-8 right-8 text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            Response
            <Zap size={14} className="text-purple-500" />
          </div>

          <p className="text-2xl md:text-3xl font-medium text-slate-100 leading-relaxed">
            {card.back_text}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
