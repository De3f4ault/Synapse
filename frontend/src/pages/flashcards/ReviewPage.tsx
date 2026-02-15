/**
 * ReviewPage — Flashcard Study Session
 * 
 * Auto-starts on mount. No interstitial gate.
 * Plain dark background (no Aurora).
 */

import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { Trophy, Loader2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  useStudySession,
  useStudyShortcuts,
  FlashcardView,
  RatingControls,
  type StudySessionStats,
} from './study';
import { useActiveDeck } from './core';
import { EmptyState } from './shared';
import {
  useTTSFlashcard,
  useAutonomousAudio,
  notificationClient,
} from '@/platform/audio';

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export function ReviewPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const parsedDeckId = deckId ? parseInt(deckId, 10) : 0;
  const autoStarted = useRef(false);

  // Local "done" state — survives store reset
  const [sessionDone, setSessionDone] = useState(false);
  const [finalStats, setFinalStats] = useState<StudySessionStats | null>(null);

  useActiveDeck({ deckId: parsedDeckId });

  const {
    isLoading,
    isSessionActive,
    isSessionComplete,
    error,
    currentCard,
    isFlipped,
    progress,
    startSession,
    flipCard,
    submitReview,
    getSessionStats,
    endSession,
  } = useStudySession({ deckId: parsedDeckId });

  // Auto-start session as soon as cards are loaded
  useEffect(() => {
    if (!isLoading && !isSessionActive && !isSessionComplete && !error && !autoStarted.current && !sessionDone) {
      autoStarted.current = true;
      startSession();
    }
  }, [isLoading, isSessionActive, isSessionComplete, error, startSession, sessionDone]);

  // Audio: TTS for flashcard answers
  useTTSFlashcard({
    cardId: currentCard?.id ?? null,
    answerText: currentCard?.back_text ?? '',
    isFlipped,
  });

  useAutonomousAudio();

  // When store says session is complete, capture stats into local state
  // (before endSession resets the store)
  useEffect(() => {
    if (isSessionComplete && !sessionDone) {
      const stats = getSessionStats();
      setFinalStats(stats);
      setSessionDone(true);
      notificationClient.play('success');
    }
  }, [isSessionComplete, sessionDone, getSessionStats]);

  useStudyShortcuts({
    enabled: isSessionActive && !!currentCard,
    isFlipped,
    onFlip: flipCard,
    onRate: submitReview,
    onEndSession: () => {
      endSession();
      navigate('/flashcards');
    },
  });

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-slate-600 animate-spin" />
      </div>
    );
  }

  // Error / No cards
  if (error && !sessionDone) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <EmptyState
          icon={<Trophy className="h-12 w-12" />}
          title="Session Complete"
          description={error}
          action={{
            label: "Back to Hub",
            onClick: () => navigate("/flashcards"),
          }}
          variant="error"
        />
      </div>
    );
  }

  // Session Complete — uses local state, NOT the store's isSessionComplete
  if (sessionDone && finalStats) {
    const accuracy = finalStats.totalReviewed > 0
      ? (finalStats.correct / finalStats.totalReviewed) * 100
      : 0;

    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center relative overflow-hidden p-6">
        {accuracy >= 70 && <Confetti numberOfPieces={200} recycle={false} />}

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-xl w-full text-center space-y-12"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-4">Session Complete</h1>
            <div className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-tr from-cyan-400 to-emerald-400">
              {Math.round(accuracy)}%
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Reviewed</div>
              <div className="text-2xl font-bold text-white">{finalStats.totalReviewed}</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Correct</div>
              <div className="text-2xl font-bold text-emerald-400">{finalStats.correct}</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Duration</div>
              <div className="text-2xl font-bold text-cyan-400">{formatTime(finalStats.durationMs)}</div>
            </div>
          </div>

          <button
            onClick={() => {
              endSession(); // Now safe to reset the store
              navigate('/flashcards');
            }}
            className="px-8 py-4 rounded-full bg-white text-black font-bold hover:scale-105 transition-transform"
          >
            Finish
          </button>
        </motion.div>
      </div>
    );
  }

  // Active Session — plain dark background, no Aurora
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col">
      {/* Close Button */}
      <button
        onClick={() => {
          if (confirm('End session?')) {
            endSession();
            navigate('/flashcards');
          }
        }}
        className="fixed top-6 left-6 p-2 rounded-full hover:bg-white/10 transition-colors z-20 opacity-50 hover:opacity-100"
      >
        <X size={20} className="text-slate-400" />
      </button>

      {/* Progress */}
      <div className="fixed top-6 right-6 flex flex-col items-end gap-1 z-20 opacity-50 hover:opacity-100 transition-opacity">
        <div className="text-xs font-mono text-slate-500 tracking-widest">
          {progress.current} / {progress.total}
        </div>
        <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-slate-500 transition-all duration-500"
            style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div className="flex-1 w-full flex items-center justify-center pt-24 p-4">
        <AnimatePresence mode="wait">
          {currentCard && (
            <motion.div
              key={currentCard.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-full max-w-md h-[70vh] flex items-center justify-center"
            >
              <FlashcardView
                card={currentCard}
                isFlipped={isFlipped}
                onFlip={flipCard}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Rating Controls */}
      <div className="h-32 flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {isFlipped ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <RatingControls onRate={submitReview} disabled={false} />
            </motion.div>
          ) : currentCard ? (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={flipCard}
              className="px-8 py-4 rounded-full bg-white/5 border border-white/10 text-slate-300 font-medium hover:bg-white/10 transition-colors tracking-widest uppercase text-sm"
            >
              Reveal Answer
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
