/**
 * ReviewPage - Imprint Card System
 * REFACTORED: Neumorphic Design
 */

import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { ChevronLeft, Trophy, Loader2, Clock, Brain, X } from "lucide-react";
import { useDueCards } from "./hooks/useCards";
import { useReviewSession, formatTime } from "./hooks/useReviewSession";
import { CardFlip } from "./components/review/CardFlip";
import { DifficultyButtons } from "./components/review/DifficultyButtons";
import { FloatingPageDock } from "@/components/layout/FloatingPageDock";
import {
  NeumorphicButton,
  NeumorphicProgress,
  NeumorphicCard,
} from "@/components/neumorphic";
import { cn } from "@/lib/utils";
import type { ReviewQuality } from "./types/flashcards.types";

export function ReviewPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  // Fetch due cards
  const { data: dueCards, isLoading } = useDueCards(
    deckId ? parseInt(deckId, 10) : undefined,
  );

  // Review session hook
  const {
    session,
    currentCard,
    isFlipped,
    sessionEnded,
    isPending,
    elapsedTime,
    flipCard,
    reviewCard,
    remainingCards,
    progress,
  } = useReviewSession({
    cards: dueCards || [],
    deckId: deckId ? parseInt(deckId, 10) : undefined,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#e0e5ec] dark:bg-[#020202] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-cyan-500 animate-spin" />
          <p className="text-slate-400 font-mono text-sm tracking-widest">
            INITIALIZING...
          </p>
        </div>
      </div>
    );
  }

  // No cards available
  if (!dueCards || dueCards.length === 0) {
    return (
      <div className="min-h-screen nm-bg flex flex-col items-center justify-center relative overflow-hidden nm-constellation-bg">
        <NeumorphicCard className="p-12 flex flex-col items-center text-center max-w-lg">
          <div className="w-24 h-24 rounded-full nm-inset flex items-center justify-center mb-6 text-emerald-500">
            <Trophy className="h-10 w-10" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
            All Caught Up!
          </h2>
          <p className="text-slate-400 text-lg mb-8">
            You've reviewed all pending cards. Neural pathways consolidated.
          </p>
          <NeumorphicButton
            onClick={() => navigate("/flashcards")}
            variant="primary"
            size="lg"
          >
            <ChevronLeft className="mr-2 h-5 w-5" />
            Return to Hub
          </NeumorphicButton>
        </NeumorphicCard>
      </div>
    );
  }

  // Session summary
  if (sessionEnded) {
    const totalReviewed = session.correct + session.incorrect;
    const accuracy =
      totalReviewed > 0 ? (session.correct / totalReviewed) * 100 : 0;

    return (
      <div className="min-h-screen nm-bg flex flex-col items-center justify-center relative overflow-hidden p-6 nm-constellation-bg">
        {accuracy >= 70 && <Confetti numberOfPieces={300} recycle={false} />}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="z-10 w-full max-w-3xl space-y-8"
        >
          <div className="text-center">
            <div className="w-24 h-24 mx-auto nm-inset rounded-full flex items-center justify-center mb-6">
              <Trophy size={40} className="text-yellow-400" />
            </div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">
              Session Complete
            </h1>
            <p className="text-slate-400 font-medium">
              Memory consolidation successful
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <NeumorphicCard className="p-6 text-center flex flex-col justify-center items-center h-40">
              <div className="text-xs text-slate-500 uppercase font-bold mb-2 tracking-wider">
                Accuracy
              </div>
              <div
                className={cn(
                  "text-4xl font-bold",
                  accuracy >= 80
                    ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                    : accuracy >= 60
                      ? "text-yellow-400"
                      : "text-red-400",
                )}
              >
                {Math.round(accuracy)}%
              </div>
            </NeumorphicCard>
            <NeumorphicCard className="p-6 text-center flex flex-col justify-center items-center h-40">
              <div className="text-xs text-slate-500 uppercase font-bold mb-2 tracking-wider">
                Cards
              </div>
              <div className="text-4xl font-bold text-white">
                {totalReviewed}
              </div>
            </NeumorphicCard>
            <NeumorphicCard className="p-6 text-center flex flex-col justify-center items-center h-40">
              <div className="text-xs text-slate-500 uppercase font-bold mb-2 tracking-wider">
                Correct
              </div>
              <div className="text-4xl font-bold text-emerald-400">
                {session.correct}
              </div>
            </NeumorphicCard>
            <NeumorphicCard className="p-6 text-center flex flex-col justify-center items-center h-40">
              <div className="text-xs text-slate-500 uppercase font-bold mb-2 tracking-wider">
                Time
              </div>
              <div className="text-4xl font-bold text-cyan-400">
                {formatTime(elapsedTime)}
              </div>
            </NeumorphicCard>
          </div>

          <div className="flex gap-4 justify-center pt-8">
            <NeumorphicButton
              variant="primary"
              size="lg"
              onClick={() => navigate("/flashcards")}
              className="px-12"
            >
              Finish Review
            </NeumorphicButton>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main Card Interface
  return (
    <div className="h-screen nm-bg flex flex-col text-slate-200 relative overflow-hidden nm-constellation-bg">
      {/* Header */}
      <div className="h-20 flex items-center justify-between px-8 z-20">
        <NeumorphicButton
          variant="ghost"
          onClick={() => {
            if (confirm("End review session? Progress will be saved.")) {
              navigate("/flashcards");
            }
          }}
          className="flex items-center gap-2"
        >
          <X size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">
            Exit
          </span>
        </NeumorphicButton>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full nm-inset">
            <Clock size={14} className="text-slate-400" />
            <span className="font-mono text-sm text-slate-300">
              {formatTime(elapsedTime)}
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full nm-inset">
            <Brain size={14} className="text-cyan-400" />
            <span className="font-mono text-sm text-cyan-300">
              {remainingCards} Left
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-8 w-full max-w-4xl mx-auto z-20">
        <NeumorphicProgress value={progress} color="cyan" size="sm" />
      </div>

      {/* Main Card Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-3xl aspect-[16/10] relative">
          {currentCard && (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentCard.id}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full"
              >
                <CardFlip
                  card={currentCard}
                  isFlipped={isFlipped}
                  onFlip={flipCard}
                />
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Keyboard Hints */}
        {!isFlipped && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-slate-500 font-mono text-xs tracking-[0.2em] uppercase flex flex-col items-center gap-2"
          >
            <span>Press Space to Reveal</span>
            <div className="w-1 h-1 rounded-full bg-slate-500/50" />
          </motion.div>
        )}
      </div>

      {/* Controls Footer */}
      <FloatingPageDock className="justify-center !bg-transparent !border-0 !shadow-none !backdrop-blur-none p-0 mb-8">
        <AnimatePresence mode="wait">
          {isFlipped ? (
            <div className="w-full max-w-3xl px-4">
              <DifficultyButtons
                onReview={(q) => reviewCard(q as ReviewQuality)}
                disabled={isPending}
              />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <NeumorphicButton
                onClick={flipCard}
                variant="primary"
                className="px-16 h-14 text-lg tracking-wide rounded-full shadow-[0_10px_30px_-10px_rgba(6,182,212,0.5)]"
              >
                Show Answer
              </NeumorphicButton>
            </motion.div>
          )}
        </AnimatePresence>
      </FloatingPageDock>
    </div>
  );
}
