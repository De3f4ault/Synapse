/**
 * ReviewPage — Flashcard Study Session
 *
 * v4: Two-zone layout — card mode ↔ tutor mode via AnimatePresence.
 * CardTutorPanel is embedded (not floating). No blur, no aurora.
 * Plain dark background.
 */

import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X, AlertCircle, BookOpen, ChevronLeft, SkipForward } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  useCuratedSession,
  useStudyShortcuts,
  FlashcardView,
  RatingControls,
  CardTutorPanel,
  type StudySessionStats,
} from './study';
import { useActiveDeck } from './core';
import { EmptyState } from './shared';
import { useTTSFlashcard } from '@/platform/audio/hooks/useTTSFlashcard';
import { useAutonomousAudio } from '@/platform/audio/hooks/useAutonomousAudio';
import { notificationClient } from '@/platform/audio/clients/NotificationClient';

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function formatNextReview(date: Date): string {
  const now  = new Date();
  const diff = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0)  return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff <= 6)  return `In ${diff} days`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ReviewPage() {
  const { deckId }   = useParams<{ deckId: string }>();
  const navigate     = useNavigate();
  const location     = useLocation();
  const parsedDeckId = deckId ? parseInt(deckId, 10) : undefined;
  const autoStarted  = useRef(false);

  const resumeSessionId = (location.state as any)?.resumeSessionId as number | undefined;

  const [sessionDone, setSessionDone]       = useState(false);
  const [finalStats, setFinalStats]         = useState<StudySessionStats | null>(null);
  const [nextReviewDate, setNextReviewDate] = useState<Date | null>(null);
  const [tutorCardId, setTutorCardId]       = useState<number | null>(null);

  useActiveDeck({ deckId: parsedDeckId ?? 0 });

  const {
    sessionId,
    isCreating: isLoading,
    isComplete: isSessionComplete,
    currentCard,
    isFlipped,
    progress,
    visitedStack,
    ratingBreakdown,
    startSession,
    resumeFromSession,
    flipCard,
    submitReview: submitCuratedReview,
    goBack,
    skipCard,
  } = useCuratedSession({ deckId: parsedDeckId });

  const isSessionActive = !!currentCard || isLoading;
  const error: string | null = null;

  const openTutor = (cardId: number) => setTutorCardId(cardId);

  const submitReview = async (rating: Parameters<typeof submitCuratedReview>[0]) => {
    const ratedCardId = currentCard?.card_id ?? null;
    if (tutorCardId) setTutorCardId(null);
    await submitCuratedReview(rating);
    if (rating === 0 && ratedCardId) {
      setTimeout(() => setTutorCardId(ratedCardId), 350);
    }
  };

  const handleGoBack = () => {
    if (tutorCardId) setTutorCardId(null);
    goBack();
  };

  const handleSkip = () => {
    if (tutorCardId) setTutorCardId(null);
    skipCard();
  };

  const sessionStartMs = useRef(Date.now());
  const getSessionStats = (): StudySessionStats => {
    const total = progress.completed;
    const rb = ratingBreakdown;
    const correct = rb.good + rb.easy;
    const incorrect = rb.again + rb.hard;
    return {
      totalReviewed: total,
      correct,
      incorrect,
      accuracy: total > 0 ? correct / total : 0,
      durationMs: Date.now() - sessionStartMs.current,
      avgTimePerCardMs: total > 0 ? (Date.now() - sessionStartMs.current) / total : 0,
      cardsPerMinute: total > 0 ? total / ((Date.now() - sessionStartMs.current) / 60_000) : 0,
      ratingBreakdown: rb,
    };
  };
  const getEarliestNextReview = () => null;
  const endSession = () => {};

  useEffect(() => {
    if (!autoStarted.current && !isSessionComplete && !isLoading) {
      autoStarted.current = true;
      if (resumeSessionId) resumeFromSession(resumeSessionId);
      else startSession();
    }
  }, [isLoading, isSessionComplete, resumeSessionId, resumeFromSession, startSession]);

  useTTSFlashcard({
    cardId: currentCard?.card_id ?? null,
    answerText: currentCard?.back_text ?? '',
    isFlipped,
  });
  useAutonomousAudio();

  useEffect(() => {
    if (isSessionComplete && !sessionDone) {
      setFinalStats(getSessionStats());
      setNextReviewDate(getEarliestNextReview());
      setSessionDone(true);
      notificationClient.play('success');
    }
  }, [isSessionComplete, sessionDone]);

  useStudyShortcuts({
    enabled: isSessionActive && !!currentCard && !tutorCardId,
    isFlipped,
    onFlip: flipCard,
    onRate: (rating) => submitReview(rating),
    onEndSession: () => navigate('/flashcards'),
  });

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  // ── No cards due (session created but empty queue) ────────────────────────
  if (!isLoading && sessionId !== null && !currentCard && !sessionDone && !isSessionComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <EmptyState
          icon={<BookOpen className="h-12 w-12" />}
          title="All Caught Up!"
          description="No cards are due for review in this deck right now. Come back later or study a different deck."
          action={{ label: 'Back to Decks', onClick: () => navigate('/flashcards') }}
          variant="no-data"
        />
      </div>
    );
  }

  if (error && !sessionDone) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <EmptyState
          icon={<AlertCircle className="h-12 w-12" />}
          title="Session Error"
          description={error}
          action={{ label: 'Back to Hub', onClick: () => navigate('/flashcards') }}
          variant="error"
        />
      </div>
    );
  }

  // ── Session Complete ─────────────────────────────────────────────────────────
  if (sessionDone && finalStats) {
    const accuracy = finalStats.totalReviewed > 0
      ? (finalStats.correct / finalStats.totalReviewed) * 100
      : 0;

    const { ratingBreakdown: rb, avgTimePerCardMs, cardsPerMinute, totalReviewed } = finalStats;
    const avgSec = (avgTimePerCardMs / 1000).toFixed(1);
    const pace   = cardsPerMinute.toFixed(1);
    const pct    = (n: number) => totalReviewed > 0 ? (n / totalReviewed) * 100 : 0;

    const grade =
      accuracy >= 95 ? { letter: 'A+', color: 'text-accent-olive'   } :
      accuracy >= 85 ? { letter: 'A',  color: 'text-accent-olive'   } :
      accuracy >= 75 ? { letter: 'B',  color: 'text-primary'        } :
      accuracy >= 65 ? { letter: 'C',  color: 'text-warning'        } :
      accuracy >= 50 ? { letter: 'D',  color: 'text-warning'        } :
                       { letter: 'F',  color: 'text-destructive'     };

    // Rating bar colors use system tokens via inline style
    const ratingColors = {
      again: 'hsl(var(--destructive))',
      hard:  'hsl(var(--warning))',
      good:  'hsl(var(--primary))',
      easy:  '#788c5d',
    };

    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="max-w-lg w-full space-y-7"
        >
          <div className="text-center space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-muted-foreground">Session Report</p>
            <div className="flex items-end justify-center gap-3">
              <div className="text-7xl font-bold tabular-nums text-foreground">
                {Math.round(accuracy)}<span className="text-4xl text-muted-foreground">%</span>
              </div>
              <div className={`text-5xl font-bold tabular-nums pb-1 ${grade.color}`}>{grade.letter}</div>
            </div>
            <p className="text-sm text-muted-foreground">
              {finalStats.correct} recalled · {finalStats.incorrect} missed · {totalReviewed} total
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Cards',    value: String(totalReviewed),             sub: 'reviewed'      },
              { label: 'Duration', value: formatTime(finalStats.durationMs), sub: 'elapsed'       },
              { label: 'Pace',     value: `${pace}/min`,                     sub: 'cards per min' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-card border border-border rounded-2xl p-4 text-center">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
                <div className="text-xl font-bold text-foreground tabular-nums">{value}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Response Breakdown</p>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-foreground/10">
              {pct(rb.again) > 0 && <div style={{ width: `${pct(rb.again)}%`, background: ratingColors.again }} />}
              {pct(rb.hard)  > 0 && <div style={{ width: `${pct(rb.hard)}%`,  background: ratingColors.hard  }} />}
              {pct(rb.good)  > 0 && <div style={{ width: `${pct(rb.good)}%`,  background: ratingColors.good  }} />}
              {pct(rb.easy)  > 0 && <div style={{ width: `${pct(rb.easy)}%`,  background: ratingColors.easy  }} />}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Again', count: rb.again, color: ratingColors.again },
                { label: 'Hard',  count: rb.hard,  color: ratingColors.hard  },
                { label: 'Good',  count: rb.good,  color: ratingColors.good  },
                { label: 'Easy',  count: rb.easy,  color: ratingColors.easy  },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-card border border-border">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-xs font-bold text-foreground tabular-nums">{count}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-card">
              <span className="text-sm text-muted-foreground">Avg. time per card</span>
              <span className="text-sm font-bold text-foreground tabular-nums">{avgSec}s</span>
            </div>
            {nextReviewDate && (
              <div className="flex items-center justify-between px-4 py-3 bg-card">
                <span className="text-sm text-muted-foreground">Next review due</span>
                <span className="text-sm font-bold text-foreground">{formatNextReview(nextReviewDate)}</span>
              </div>
            )}
          </div>

          <button
            onClick={() => { endSession(); navigate('/flashcards'); }}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            Back to Decks
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Active Session ─────────────────────────────────────────────────────────
  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">

      {/* Header bar — close / back / progress */}
      <div className="shrink-0 h-14 flex items-center justify-between px-4 border-b border-border/40 z-10">
        <div className="flex items-center gap-1">
          <button
            onClick={() => { if (confirm('End session?')) { endSession(); navigate('/flashcards'); } }}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
          <AnimatePresence>
            {visitedStack.length > 0 && (
              <motion.button
                key="back-btn"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                onClick={handleGoBack}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Previous card"
              >
                <ChevronLeft size={16} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Centered progress */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-mono text-muted-foreground tracking-widest">
            {progress.current} / {progress.total}
          </span>
          <div className="w-24 h-0.5 bg-foreground/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/60 transition-all duration-500"
              style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="w-16" />
      </div>

      {/* Main — AnimatePresence switches between CARD MODE and TUTOR MODE */}
      <AnimatePresence mode="wait">

        {tutorCardId ? (
          /* ── TUTOR MODE ─────────────────────────────────────────────────── */
          <motion.div
            key="tutor-mode"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex-1 min-h-0 flex flex-col"
          >
            {/* Compact card context strip */}
            {currentCard && (
              <div className="shrink-0 px-5 py-3 border-b border-border bg-card/30">
                <div className="max-w-lg mx-auto flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-muted-foreground mb-1">
                      Studying
                    </p>
                    <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                      {currentCard.front_text}
                    </p>
                  </div>
                  <button
                    onClick={() => setTutorCardId(null)}
                    className="shrink-0 text-[10px] text-muted-foreground hover:text-primary transition-colors whitespace-nowrap pt-4"
                  >
                    ← Back to card
                  </button>
                </div>
              </div>
            )}

            {/* CardTutorPanel fills all remaining space */}
            <div className="flex-1 min-h-0">
              <CardTutorPanel
                cardId={tutorCardId}
                cardFront={currentCard?.front_text}
                cardBack={currentCard?.back_text}
                onClose={() => setTutorCardId(null)}
              />
            </div>
          </motion.div>

        ) : (
          /* ── CARD MODE ──────────────────────────────────────────────────── */
          <motion.div
            key="card-mode"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex-1 min-h-0 flex flex-col"
          >
            {/* Flashcard */}
            <div className="flex-1 min-h-0 w-full flex items-center justify-center p-4">
              <AnimatePresence mode="wait">
                {currentCard && (
                  <motion.div
                    key={currentCard.card_id}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.05, filter: 'blur(4px)' }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="w-full max-w-md h-full"
                  >
                    <FlashcardView
                      card={{
                        id: currentCard.card_id,
                        deck_id: currentCard.deck_id,
                        front_text: currentCard.front_text,
                        back_text: currentCard.back_text,
                        learning_state: (currentCard.learning_state as any) ?? 'review',
                        ease_factor: currentCard.ease_factor,
                        next_review: currentCard.next_review,
                      }}
                      isFlipped={isFlipped}
                      onFlip={flipCard}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Rating Controls + secondary actions */}
            <div className="shrink-0 flex flex-col items-center gap-2 px-6 pb-8 pt-3 min-h-[7rem]">
              <AnimatePresence mode="wait">
                {isFlipped ? (
                  <motion.div
                    key="rating"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <RatingControls onRate={submitReview} disabled={false} />
                    <div className="flex items-center gap-4">
                      {currentCard && (
                        <button
                          onClick={() => openTutor(currentCard.card_id)}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-primary transition-colors py-1"
                        >
                          <BookOpen size={12} />
                          Need help?
                        </button>
                      )}
                      {currentCard && (
                        <button
                          onClick={handleSkip}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors py-1"
                          title="Skip — card returns at end of queue"
                        >
                          <SkipForward size={12} />
                          Skip
                        </button>
                      )}
                    </div>
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
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
