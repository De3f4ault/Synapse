/**
 * StudySessionPage — Full immersive cross-deck study session (Ring 3).
 *
 * Sprint 2 wiring: uses useCuratedSession for server-curated queue with
 * full persistence and checkpointing. Handles two entry points:
 *
 *   1. Fresh session: navigated to from Study Hub "Start Session" button
 *   2. Resume:        navigated to from ResumeSessionBanner "Continue" button
 *                     → location.state.resumeSessionId carries the existing id
 *
 * On session complete: shows the same factual summary as ReviewPage.
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useCuratedSession } from '../flashcards/study/hooks/useCuratedSession';
import { FlashcardView }     from '../flashcards/study/components/FlashcardView';
import { RatingControls }    from '../flashcards/study/components/RatingControls';
import { CardTutorPanel }    from '../flashcards/study/components/CardTutorPanel';

export function StudySessionPage() {
  const navigate  = useNavigate();
  const location  = useLocation();

  // Resume support — populated when coming from ResumeSessionBanner
  const resumeSessionId = (location.state as any)?.resumeSessionId as number | undefined;

  const autoStarted = useRef(false);
  const [tutorCardId, setTutorCardId] = useState<number | null>(null);

  const {
    isCreating,
    isComplete,
    currentCard,
    isFlipped,
    progress,
    startSession,
    resumeFromSession,
    flipCard,
    submitReview: submitCuratedReview,
  } = useCuratedSession({
    // Cross-deck session — no deckId
    sessionMode: 'classic',
    budget: 25,
  });

  // Auto-start or auto-resume on mount
  useEffect(() => {
    if (!autoStarted.current && !isComplete && !isCreating) {
      autoStarted.current = true;
      if (resumeSessionId) {
        resumeFromSession(resumeSessionId);
      } else {
        startSession();
      }
    }
  }, [isComplete, isCreating, resumeSessionId, resumeFromSession, startSession]);

  // Auto-open Card Tutor on rating 0 ('again')
  const submitReview = async (rating: Parameters<typeof submitCuratedReview>[0]) => {
    if (rating === 0 && currentCard) setTutorCardId(currentCard.card_id); // 0 = 'again'
    await submitCuratedReview(rating);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isCreating && !currentCard) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          <p className="text-muted-foreground uppercase tracking-widest text-xs">
            {resumeSessionId ? 'Resuming session…' : 'Curating your session…'}
          </p>
        </div>
      </div>
    );
  }

  // ── All caught up ────────────────────────────────────────────────────────
  if (!isCreating && !currentCard && !isComplete) {
    return (
      <div className="h-screen bg-background">
        <button
          onClick={() => navigate('/study')}
          className="fixed top-6 left-6 p-2 rounded-full hover:bg-muted transition-colors z-20 opacity-50 hover:opacity-100"
        >
          <X size={20} className="text-muted-foreground" />
        </button>

        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-foreground">All caught up!</h1>
            <p className="text-muted-foreground">No cards due for review right now.</p>
            <button
              onClick={() => navigate('/study')}
              className="px-8 py-4 rounded-full bg-foreground/5 border border-border text-foreground/80 font-medium hover:bg-muted transition-colors"
            >
              Back to Study Hub
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Session Complete ─────────────────────────────────────────────────────
  if (isComplete) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="max-w-sm w-full space-y-6 text-center"
        >
          <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-muted-foreground">
            Session Complete
          </p>
          <p className="text-5xl font-bold text-foreground tabular-nums">
            {progress.completed}
            <span className="text-2xl text-muted-foreground"> cards</span>
          </p>
          <p className="text-sm text-muted-foreground">
            reviewed this session
          </p>
          <button
            onClick={() => navigate('/study')}
            className="w-full py-3.5 rounded-2xl border border-border bg-foreground/5 hover:bg-foreground/10 text-foreground font-semibold transition-colors"
          >
            Back to Study Hub
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Active Session ───────────────────────────────────────────────────────
  return (
    <>
      <div className="h-screen overflow-hidden bg-background flex flex-col">
        {/* Close Button */}
        <button
          onClick={() => {
            if (confirm('End session?')) navigate('/study');
          }}
          className="fixed top-6 left-6 p-2 rounded-full hover:bg-muted transition-colors z-20 opacity-50 hover:opacity-100"
        >
          <X size={20} className="text-muted-foreground" />
        </button>

        {/* Progress */}
        <div className="fixed top-6 right-6 flex flex-col items-end gap-1 z-20 opacity-50 hover:opacity-100 transition-opacity">
          <div className="text-xs font-mono text-muted-foreground tracking-widest">
            {progress.current} / {progress.total}
          </div>
          <div className="w-32 h-1 bg-foreground/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-500 transition-all duration-500"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>

        {/* Flashcard */}
        <div className="flex-1 min-h-0 w-full flex items-center justify-center p-4">
          <AnimatePresence mode="wait">
            {currentCard && (
              <motion.div
                key={currentCard.card_id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="w-full max-w-md h-full"
              >
                <FlashcardView
                  card={currentCard as any}
                  isFlipped={isFlipped}
                  onFlip={flipCard}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Rating Controls */}
        <div className="flex-shrink-0 flex flex-col items-center gap-2 px-6 pb-8 pt-3 min-h-[7rem]">
          <AnimatePresence mode="wait">
            {isFlipped ? (
              <motion.div
                key="rating"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="flex flex-col items-center gap-3"
              >
                <RatingControls
                  onRate={(rating) => submitReview(rating)}
                  disabled={false}
                />
                {currentCard && !tutorCardId && (
                  <button
                    onClick={() => setTutorCardId(currentCard.card_id)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-primary transition-colors py-1"
                  >
                    <BookOpen size={12} />
                    Need help with this concept?
                  </button>
                )}
              </motion.div>
            ) : currentCard ? (
              <motion.button
                key="reveal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={flipCard}
                className="px-8 py-4 rounded-full bg-foreground/5 border border-border text-foreground/80 font-medium hover:bg-muted transition-colors tracking-widest uppercase text-sm"
              >
                Reveal Answer
              </motion.button>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Card Tutor Panel */}
      <CardTutorPanel
        cardId={tutorCardId}
        cardTopic={currentCard?.topic ?? null}
        onClose={() => setTutorCardId(null)}
      />
    </>
  );
}
