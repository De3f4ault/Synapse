// ... ReviewPage ...
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { Trophy, Loader2, X } from 'lucide-react';
import {
  useStudySession,
  useStudyShortcuts,
  FlashcardView,
  RatingControls,
  AuroraBackground,
} from './study';
import { useActiveDeck } from './core';
import { EmptyState } from './shared';

// Minimalist time formatter
function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function ReviewPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const parsedDeckId = deckId ? parseInt(deckId, 10) : 0;

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
    endSession,
  } = useStudySession({ deckId: parsedDeckId });

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

  const sessionStats = isSessionComplete ? endSession() : null;

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-slate-600 animate-spin" />
      </div>
    );
  }

  // Error State
  if (error) {
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

  // Not Started
  if (!isSessionActive && !isSessionComplete) {
    return (
      <AuroraBackground>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight">
              Ready to Focus?
            </h1>
            <p className="text-xl text-slate-400 max-w-md mx-auto">
              {progress.total} cards queued for review.
              Find your flow state.
            </p>
            <button
              onClick={startSession}
              className="px-8 py-4 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-medium hover:bg-cyan-500/20 hover:scale-105 transition-all duration-300"
            >
              Start Session
            </button>
          </motion.div>
        </div>
      </AuroraBackground>
    );
  }

  // Session Complete
  if (isSessionComplete && sessionStats) {
    const accuracy = sessionStats.totalReviewed > 0
      ? (sessionStats.correct / sessionStats.totalReviewed) * 100
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
              <div className="text-2xl font-bold text-white">{sessionStats.totalReviewed}</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Correct</div>
              <div className="text-2xl font-bold text-emerald-400">{sessionStats.correct}</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Duration</div>
              <div className="text-2xl font-bold text-cyan-400">{formatTime(sessionStats.durationMs)}</div>
            </div>
          </div>

          <button
            onClick={() => navigate('/flashcards')}
            className="px-8 py-4 rounded-full bg-white text-black font-bold hover:scale-105 transition-transform"
          >
            Finish
          </button>
        </motion.div>
      </div>
    );
  }

  // Active Session
  return (
    <AuroraBackground>
      {/* Top Controls (Minimal) */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20 opacity-50 hover:opacity-100 transition-opacity">
        <button
          onClick={() => {
            if (confirm('End session?')) {
              endSession();
              navigate('/flashcards');
            }
          }}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X size={20} className="text-slate-400" />
        </button>

        <div className="flex flex-col items-end gap-1">
          <div className="text-xs font-mono text-slate-500 tracking-widest">
            {progress.current} / {progress.total}
          </div>
          <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-500 transition-all duration-500"
              style={{ width: `${(progress.completed / progress.total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Stage */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 z-10">
        <div className="h-[65vh] w-full flex items-center justify-center">
          <AnimatePresence mode="wait">
            {currentCard && (
              <motion.div
                key={currentCard.id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full h-full flex items-center justify-center"
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
      </div>

      {/* Bottom Controls */}
      <div className="h-32 flex items-center justify-center p-6 z-20">
        <AnimatePresence mode="wait">
          {isFlipped ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <RatingControls onRate={submitReview} disabled={false} />
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={flipCard}
              className="px-8 py-4 rounded-full bg-white/5 border border-white/10 text-slate-300 font-medium hover:bg-white/10 transition-colors tracking-widest uppercase text-sm"
            >
              Reveal Answer
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </AuroraBackground>
  );
}

