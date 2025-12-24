/**
 * CardFlip Component
 * 3D flip animation for flashcard review - Glass Style with scrollable content
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
    <>
      {/* Hidden scrollbar styles */}
      <style>{`
        .card-scrollable::-webkit-scrollbar { display: none; }
        .card-scrollable { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div
        className="w-full h-full cursor-pointer"
        style={{ perspective: "1200px" }}
        onClick={onFlip}
      >
        <motion.div
          className="w-full h-full relative"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        >
          {/* FRONT FACE WRAPPER - Handles 3D visibility */}
          <div
            className="absolute inset-0"
            style={{
              backfaceVisibility: "hidden",
            }}
          >
            {/* FRONT CONTENT - Handles Glass Effect */}
            <div
              className="w-full h-full rounded-3xl p-8 overflow-hidden relative"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              {/* Noise texture overlay */}
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none mix-blend-overlay" />

              {/* Gradient border glow */}
              <div className="absolute inset-0 rounded-3xl opacity-40 pointer-events-none"
                style={{
                  background: "linear-gradient(135deg, rgba(6,182,212,0.15) 0%, transparent 50%, rgba(139,92,246,0.15) 100%)",
                }}
              />

              {/* Header */}
              <div className="absolute top-6 left-8 text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 z-20">
                <Brain size={14} className="text-cyan-500" />
                Query
              </div>

              {/* Full scrollable content area */}
              <div className="h-full w-full pt-10 pb-10 overflow-y-auto card-scrollable flex items-center justify-center">
                <h2 className="text-2xl md:text-4xl font-bold text-slate-200 leading-relaxed text-center px-4">
                  {card.front_text}
                </h2>
              </div>

              {/* Footer hint */}
              <div className="absolute bottom-6 left-0 right-0 text-center text-[10px] font-mono text-slate-600 uppercase tracking-[0.2em] z-20">
                Click to Reveal
              </div>
            </div>
          </div>

          {/* BACK FACE WRAPPER - Handles 3D visibility */}
          <div
            className="absolute inset-0"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            {/* BACK CONTENT - Handles Glass Effect */}
            <div
              className="w-full h-full rounded-3xl p-8 overflow-hidden relative"
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(139,92,246,0.2)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              {/* Noise texture overlay */}
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none mix-blend-overlay" />

              {/* Purple gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />

              {/* Header */}
              <div className="absolute top-6 right-8 text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 z-20">
                Response
                <Zap size={14} className="text-purple-500" />
              </div>

              {/* Full scrollable content area */}
              <div className="h-full w-full pt-10 pb-8 overflow-y-auto card-scrollable flex items-center justify-center">
                <p className="text-xl md:text-2xl font-medium text-slate-100 leading-relaxed text-center px-4">
                  {card.back_text}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}


