/**
 * useCuratedSession
 *
 * Replaces the "fetch due cards → start session" flow with the Sprint 2
 * curated queue API (POST /study/sessions/curated).
 *
 * Differences from useStudySession:
 *  - Queue is server-curated: 25 cards max, topic-interleaved, prioritised
 *  - Session is persistent: every card review POSTs a checkpoint
 *  - session_id is returned immediately and used for all downstream calls
 *
 * The SM-2 review mutation (POST /cards/{id}/review) is unchanged —
 * it runs in parallel with the checkpoint so the FSRS/SM-2 state is
 * always updated regardless of session state.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { StudySessionsService, FlashcardsService, OpenAPI } from '@/api/generated';
import { getAuthToken } from '@/api/client';
import type { ReviewRating } from '../../../flashcards/core';
import { RATING_TO_API_QUALITY } from '../../../flashcards/core';

interface CuratedCard {
  card_id: number;
  deck_id: number;
  deck_name: string;
  front_text: string;
  back_text: string;
  topic: string | null;
  card_type: string;
  learning_state: string;
  next_review: string | null;
  ease_factor: number;
}

interface CuratedSession {
  id: number;
  deck_id: number | null;
  session_mode: string;
  resume_status: string;
  cards_planned: { card_id: number; deck_id: number }[];
  current_card_index: number;
  queue: CuratedCard[];
}

interface UseCuratedSessionOptions {
  deckId?: number;       // null = cross-deck session (Study Hub)
  sessionMode?: 'classic' | 'socratic';
  budget?: number;
}

export function useCuratedSession({
  deckId,
  sessionMode = 'classic',
  budget = 25,
}: UseCuratedSessionOptions = {}) {
  const queryClient = useQueryClient();

  const [sessionId, setSessionId]         = useState<number | null>(null);
  const [queue, setQueue]                 = useState<CuratedCard[]>([]);
  const [cardIndex, setCardIndex]         = useState(0);
  const [isFlipped, setIsFlipped]         = useState(false);
  const [isComplete, setIsComplete]       = useState(false);
  const [reviewedCardIds, setReviewedCardIds] = useState<number[]>([]);
  // Back/forward navigation
  const [visitedStack, setVisitedStack]   = useState<CuratedCard[]>([]);
  // Real rating breakdown for session report
  const [ratingBreakdown, setRatingBreakdown] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const startedAt = useRef<number>(Date.now());

  // Create curated session
  const { mutateAsync: createSession, isPending: isCreating } = useMutation({
    mutationFn: () =>
      StudySessionsService.createCuratedSessionApiV1StudySessionsCuratedPost({
        deck_id: deckId ?? null,
        session_mode: sessionMode,
        budget,
      }),
    onSuccess: (data: CuratedSession) => {
      setSessionId(data.id);
      setQueue(data.queue ?? []);
      setCardIndex(0);
      setIsFlipped(false);
      setIsComplete(false);
      setReviewedCardIds([]);
      setVisitedStack([]);
      setRatingBreakdown({ again: 0, hard: 0, good: 0, easy: 0 });
      startedAt.current = Date.now();
    },
  });

  // Checkpoint mutation — fire-and-forget after every review
  const { mutate: checkpoint } = useMutation({
    mutationFn: ({
      index,
      cardReview,
    }: {
      index: number;
      cardReview?: {
        card_id: number;
        quality: number;
        duration_ms: number;
        hint_used?: boolean;
      };
    }) =>
      sessionId
        ? StudySessionsService.checkpointSessionApiV1StudySessionsSessionIdCheckpointPatch(
            sessionId,
            { current_card_index: index, card_review: cardReview },
          )
        : Promise.resolve(),
  });

  // Complete session
  const { mutate: completeSession } = useMutation({
    mutationFn: () =>
      sessionId
        ? StudySessionsService.completeSessionV2ApiV1StudySessionsSessionIdCompleteV2Post(
            sessionId,
          )
        : Promise.resolve(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study', 'active-sessions'] });
    },
  });

  // SM-2 review mutation (unchanged, runs alongside checkpoint)
  const { mutateAsync: submitSM2Review } = useMutation({
    mutationFn: ({ cardId, quality, timeTakenMs }: { cardId: number; quality: number; timeTakenMs: number }) =>
      FlashcardsService.reviewCardApiV1CardsCardIdReviewPost(cardId, {
        quality,
        time_taken_ms: timeTakenMs,
      }),
  });

  const currentCard = queue[cardIndex] ?? null;

  const cardStartedAt = useRef<number>(Date.now());
  const flipCard = useCallback(() => setIsFlipped((f) => !f), []);

  const startSession = useCallback(async () => {
    await createSession();
  }, [createSession]);

  /**
   * goBack — return to the previously reviewed card.
   * The current card is pushed back to the front of the remaining queue
   * so it will be presented again. No rating changes.
   */
  const goBack = useCallback(() => {
    if (visitedStack.length === 0) return;
    const prev = visitedStack[visitedStack.length - 1]!;
    setVisitedStack((vs) => vs.slice(0, -1));
    setQueue((q) => {
      const remaining = q.slice(cardIndex);
      return [...q.slice(0, cardIndex), prev, ...remaining];
    });
    setCardIndex((i) => Math.max(0, i - 1));
    setIsFlipped(false);
    cardStartedAt.current = Date.now();
  }, [visitedStack, cardIndex]);

  /**
   * skipCard — defer the current card to the end of the queue.
   * Records a 0-quality checkpoint (session persistence) but does NOT
   * call SM-2 (no schedule change for deferred cards).
   */
  const skipCard = useCallback(() => {
    if (!currentCard) return;
    // Move card to end of queue
    setQueue((q) => {
      const next = q.slice(cardIndex + 1);
      return [...q.slice(0, cardIndex), ...next, { ...currentCard, _skipped: true } as any];
    });
    // Checkpoint — mark as skipped (quality=0 without SM-2)
    checkpoint({
      index: cardIndex + 1,
      cardReview: { card_id: currentCard.card_id, quality: 0, duration_ms: Date.now() - cardStartedAt.current, hint_used: false },
    });
    setIsFlipped(false);
    cardStartedAt.current = Date.now();
  }, [currentCard, cardIndex, checkpoint]);

  /**
   * resumeFromSession — rehydrate an existing session from the server.
   *
   * Called when the user hits "Continue" in ResumeSessionBanner.
   * Fetches GET /study/sessions/{id}, restores the queue from cards_planned
   * starting at current_card_index, and re-uses the existing session_id so
   * all subsequent checkpoints update the same session row.
   */
  const resumeFromSession = useCallback(async (resumeSessionId: number) => {
    try {
      const token = getAuthToken() ?? '';
      const base  = (OpenAPI.BASE ?? '').replace(/\/$/, '');
      const res   = await fetch(`${base}/api/v1/study/sessions/${resumeSessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`GET /sessions/${resumeSessionId} → ${res.status}`);
      const existing = (await res.json()) as CuratedSession;

      const startIndex = existing.current_card_index ?? 0;

      setSessionId(existing.id);
      // cards_planned is [{card_id, deck_id}] — we need the enriched queue.
      // The server returns "queue" on creation but not on GET. We reconstruct
      // minimal CuratedCard objects from cards_planned and let FlashcardView
      // fetch full card data lazily if needed.
      // If the server already returns a "queue" field in GET, use it directly.
      const serverQueue = (existing as any).queue as CuratedCard[] | undefined;
      if (serverQueue && serverQueue.length > 0) {
        setQueue(serverQueue.slice(startIndex));
      } else {
        // Reconstruct minimal cards from cards_planned — FlashcardView will handle display
        const reconstructed: CuratedCard[] = (existing.cards_planned ?? []).slice(startIndex).map((p) => ({
          card_id: p.card_id,
          deck_id: p.deck_id,
          deck_name: '',
          front_text: '',
          back_text: '',
          topic: null,
          card_type: 'basic',
          learning_state: 'review',
          next_review: null,
          ease_factor: 2.5,
        }));
        setQueue(reconstructed);
      }
      setCardIndex(0); // always start from 0 within the resumed slice
      setIsFlipped(false);
      setIsComplete(false);
      setReviewedCardIds([]);
      startedAt.current = Date.now();
      cardStartedAt.current = Date.now();
    } catch (err) {
      console.error('[useCuratedSession] Failed to resume session', err);
      // Fall back to creating a fresh session
      await createSession();
    }
  }, [createSession]);


  const advanceCard = useCallback(
    (nextIndex: number) => {
      setCardIndex(nextIndex);
      setIsFlipped(false);
      cardStartedAt.current = Date.now();

      if (nextIndex >= queue.length) {
        setIsComplete(true);
        completeSession();
      }
    },
    [queue.length, completeSession],
  );

  const submitReview = useCallback(
    async (rating: ReviewRating, hintUsed = false) => {
      if (!currentCard) return;

      const quality = RATING_TO_API_QUALITY[rating];
      const duration_ms = Date.now() - cardStartedAt.current;
      const nextIndex = cardIndex + 1;

      // Track rating breakdown for session report
      const ratingKey = rating === 0 ? 'again' : rating === 1 ? 'hard' : rating === 2 ? 'good' : 'easy';
      setRatingBreakdown((rb) => ({ ...rb, [ratingKey]: rb[ratingKey as keyof typeof rb] + 1 }));

      // Push current to visited stack for back navigation
      setVisitedStack((vs) => [...vs, currentCard]);

      // 1. SM-2 review (always — card state update)
      await submitSM2Review({
        cardId: currentCard.card_id,
        quality,
        timeTakenMs: duration_ms,
      });

      // 2. Checkpoint (fire-and-forget — session persistence)
      checkpoint({
        index: nextIndex,
        cardReview: {
          card_id: currentCard.card_id,
          quality,
          duration_ms,
          hint_used: hintUsed,
        },
      });

      setReviewedCardIds((prev) => [...prev, currentCard.card_id]);
      advanceCard(nextIndex);
    },
    [currentCard, cardIndex, submitSM2Review, checkpoint, advanceCard],
  );

  const getProgress = () => ({
    current:   cardIndex + 1,
    total:     queue.length,
    completed: cardIndex,
    pct:       queue.length > 0 ? Math.round((cardIndex / queue.length) * 100) : 0,
  });

  return {
    // State
    sessionId,
    currentCard,
    queue,
    cardIndex,
    isFlipped,
    isComplete,
    isCreating,
    reviewedCardIds,
    visitedStack,
    ratingBreakdown,
    progress: getProgress(),

    // Actions
    startSession,
    resumeFromSession,
    flipCard,
    submitReview,
    goBack,
    skipCard,
  };
}
