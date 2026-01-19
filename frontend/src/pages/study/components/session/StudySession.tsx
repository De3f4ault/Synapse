/**
 * StudySession - Main study session component
 * 
 * Integrates with graph decay engine for memory reinforcement.
 * Composes polished view components (FlashcardView, RatingControls) for immersive experience.
 */

import { useState, useEffect } from "react";
import { Brain, FileQuestion, BookOpen, Clock, Play, TrendingUp, TrendingDown, Sparkles, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStudySession } from "../../hooks/useStudySession";
import { useReviewReinforcement } from "../../hooks/useReviewReinforcement";
import { SessionTimer } from "./SessionTimer";
import type {
  StudyItem,
  StudySessionResponse,
} from "../../types/study.types";
import { cn } from "@/lib/utils";

// Reuse polished components from flashcard review
import { FlashcardView, RatingControls } from "@/pages/flashcards/study";
import type { Flashcard, ReviewRating } from "@/pages/flashcards/core";

interface StudySessionProps {
  items: StudyItem[];
  sessionType?: "due" | "recommended" | "mixed";
  onComplete: (session: StudySessionResponse) => void;
  onCancel: () => void;
}

export function StudySession({
  items,
  sessionType = "mixed",
  onComplete,
  onCancel: _onCancel,
}: StudySessionProps) {
  const {
    session,
    currentItem,
    elapsedTime,
    progress: _progress,
    handleAnswer,
    handleSkip: _handleSkip,
    pauseSession,
    resumeSession,
    cancelSession: _cancelSession,
  } = useStudySession(items);

  // Flashcard flip state for immersive view
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Reset flip state when moving to a new card
  useEffect(() => {
    setIsFlipped(false);
  }, [currentItem?.id]);

  // Graph reinforcement integration
  const {
    reinforceCorrect,
    reinforceIncorrect,
    sessionStats: graphStats,
  } = useReviewReinforcement();

  // Convert StudyItem to Flashcard format for FlashcardView
  const toFlashcard = (item: StudyItem): Flashcard | null => {
    if (item.type !== "flashcard" || !item.rawData) return null;
    return {
      id: item.id,
      deck_id: item.deckId || 0,
      front_text: item.rawData.front_text || item.title,
      back_text: item.rawData.back_text || "",
      learning_state: (item.rawData.learning_state || "new") as any,
      front_media_url: item.rawData.front_media_url,
      back_media_url: item.rawData.back_media_url,
    };
  };

  // Handle SM-2 rating from RatingControls (for flashcards)
  const handleFlashcardRating = (rating: ReviewRating) => {
    const isCorrect = rating >= 2; // Good (2) or Easy (3) = correct
    handleAnswerWithReinforcement(isCorrect);
    setIsFlipped(false); // Reset for next card
  };

  // Wrapped answer handler with graph reinforcement
  const handleAnswerWithReinforcement = (isCorrect: boolean) => {
    const item = currentItem;
    if (!item) return;

    // 1. Update local session state
    handleAnswer(isCorrect);

    // 2. Update graph (after API implicit in handleAnswer)
    if (isCorrect) {
      reinforceCorrect(item);
    } else {
      reinforceIncorrect(item);
    }
  };

  // Handle session completion
  if (session.status === "completed") {
    const sessionResponse: StudySessionResponse = {
      id: session.id || 0,
      session_type: sessionType,
      modules_used: ["flashcards", "quizzes"],
      items_completed: session.stats.completedItems,
      items_correct: session.stats.correctItems,
      accuracy: session.stats.accuracy / 100,
      time_spent_seconds: session.stats.timeSpent,
      started_at: session.startTime.toISOString(),
      ended_at: session.endTime?.toISOString() || null,
      is_completed: true,
    };

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center p-8 h-full min-h-[400px]"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20 mb-4">
            <Trophy size={32} className="text-green-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Session Complete!
          </h2>
          <p className="text-slate-400">
            Great work maintaining your momentum.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-2xl mb-6">
          <StatCard
            label="Completed"
            value={session.stats.completedItems}
            color="blue"
          />
          <StatCard
            label="Correct"
            value={session.stats.correctItems}
            color="green"
          />
          <StatCard
            label="Accuracy"
            value={Math.round(session.stats.accuracy) + "%"}
            color="purple"
          />
          <StatCard
            label="Time"
            value={Math.floor(session.stats.timeSpent / 60) + "m"}
            color="cyan"
          />
        </div>

        {/* Graph Intelligence Stats */}
        {(graphStats.strengthened > 0 || graphStats.weakened > 0) && (
          <div className="w-full max-w-2xl mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-purple-400" />
              <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                Memory Intelligence
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {graphStats.strengthened > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <TrendingUp size={16} className="text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-emerald-400">
                      {graphStats.strengthened}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Strengthened
                    </div>
                  </div>
                </div>
              )}
              {graphStats.weakened > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <TrendingDown size={16} className="text-amber-400" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-amber-400">
                      {graphStats.weakened}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Needs Practice
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={() => onComplete(sessionResponse)}
            className="synapse-button"
          >
            Back to Hub
          </button>
          <button
            onClick={() => onComplete(sessionResponse)}
            className="synapse-button-primary synapse-button"
          >
            View Analytics
          </button>
        </div>
      </motion.div>
    );
  }

  if (!currentItem) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
          <p className="text-slate-400 uppercase tracking-widest text-xs">
            Initializing Session...
          </p>
        </div>
      </div>
    );
  }

  const _Icon = getItemIcon(currentItem.type);
  const flashcard = toFlashcard(currentItem);

  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Floating Timer - Unobtrusive top edge, blends with parent floating controls */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-20 opacity-50 hover:opacity-100 transition-opacity">
        <SessionTimer
          elapsedTime={elapsedTime}
          isPaused={session.status === "paused"}
          onPause={pauseSession}
          onResume={resumeSession}
        />
      </div>

      {/* Floating Progress Counter - Below timer, very subtle */}
      <div className="fixed top-[4.5rem] left-1/2 -translate-x-1/2 z-10 opacity-40">
        <span className="text-xs font-mono text-slate-500 tracking-widest">
          {session.currentIndex + 1} / {items.length}
        </span>
      </div>

      {/* Main Stage - Centered Flashcard/Quiz (matching ReviewPage) */}
      <div className="flex-1 w-full flex items-center justify-center pt-24 p-4 z-10">
        <AnimatePresence mode="wait">
          {currentItem.type === "flashcard" && flashcard ? (
            <motion.div
              key={currentItem.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-full max-w-md h-[70vh] flex items-center justify-center"
            >
              <FlashcardView
                card={flashcard}
                isFlipped={isFlipped}
                onFlip={() => setIsFlipped(!isFlipped)}
              />
            </motion.div>
          ) : (
            // Quiz/other content with minimal styling
            <motion.div
              key={currentItem.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md text-center space-y-6"
            >
              <h2 className="text-3xl font-bold text-white">
                {currentItem.title}
              </h2>
              <p className="text-slate-400">
                {currentItem.type === "quiz" 
                  ? "Rate your answer" 
                  : "Review this content"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Controls - Fixed at bottom, matching ReviewPage pattern */}
      <div className="h-32 flex items-center justify-center p-6 z-20">
        <AnimatePresence mode="wait">
          {currentItem.type === "flashcard" && isFlipped ? (
            // SM-2 Rating Controls after flip
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <RatingControls onRate={handleFlashcardRating} disabled={session.status === "paused"} />
            </motion.div>
          ) : currentItem.type === "flashcard" && !isFlipped ? (
            // Reveal Answer button
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFlipped(true)}
              disabled={session.status === "paused"}
              className="px-8 py-4 rounded-full bg-white/5 border border-white/10 text-slate-300 font-medium hover:bg-white/10 transition-colors tracking-widest uppercase text-sm"
            >
              Reveal Answer
            </motion.button>
          ) : (
            // Quiz controls
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-4"
            >
              <button
                onClick={() => handleAnswerWithReinforcement(false)}
                className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors uppercase text-sm tracking-wider"
                disabled={session.status === "paused"}
              >
                Incorrect
              </button>
              <button
                onClick={() => handleAnswerWithReinforcement(true)}
                className="px-6 py-3 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-colors uppercase text-sm tracking-wider"
                disabled={session.status === "paused"}
              >
                Correct
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pause Overlay */}
      <AnimatePresence>
        {session.status === "paused" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-2xl"
          >
            <div className="text-center p-8">
              <div className="w-16 h-16 mx-auto bg-white/5 rounded-full flex items-center justify-center border border-white/10 mb-4 animate-pulse">
                <Clock size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Session Paused
              </h3>
              <p className="text-slate-400 text-sm mb-6">
                Timer stopped. Ready when you are.
              </p>
              <button
                onClick={resumeSession}
                className="synapse-button-primary synapse-button px-8"
              >
                <Play size={16} fill="currentColor" className="mr-2" />
                Resume
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  const colors = {
    blue: "text-blue-400 shadow-blue-500/20",
    green: "text-emerald-400 shadow-emerald-500/20",
    purple: "text-purple-400 shadow-purple-500/20",
    cyan: "text-cyan-400 shadow-cyan-500/20",
  } as any;

  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
      <div className={cn("text-2xl font-bold mb-1", colors[color])}>
        {value}
      </div>
      <div className="text-[10px] text-slate-500 uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

function getItemIcon(type: string) {
  const icons = {
    flashcard: Brain,
    quiz: FileQuestion,
    note: BookOpen,
  };
  return icons[type as keyof typeof icons] || BookOpen;
}
