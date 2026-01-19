/**
 * useImmersiveSession Hook
 * 
 * Single Responsibility: Session lifecycle management and data orchestration
 * 
 * This is the primary hook for managing an immersive study session.
 * It handles item fetching, state synchronization, and API interactions.
 * 
 * Following the pattern from flashcards/study/hooks/useStudySession.ts
 */

import { useEffect, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionStore, selectCurrentItem, selectProgress, type SessionResult } from '../state';
import { useDueItems } from '../../core/hooks';
import { useReviewReinforcement } from '../../hooks/useReviewReinforcement';
import type { StudyItem } from '../../core/engine/types';
import type { ReviewRating } from '@/pages/flashcards/core';

interface UseImmersiveSessionOptions {
  sessionType: 'due' | 'recommended';
  limit?: number;
  /** If provided, use these items instead of fetching */
  initialItems?: StudyItem[];
}

interface UseImmersiveSessionResult {
  // Session state
  isLoading: boolean;
  isActive: boolean;
  isComplete: boolean;
  isPaused: boolean;
  error: string | null;
  
  // Current item
  currentItem: StudyItem | null;
  isFlipped: boolean;
  
  // Progress
  progress: { current: number; total: number; percentage: number };
  elapsedTime: number;
  
  // Actions
  startSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => SessionResult;
  
  flipCard: () => void;
  submitRating: (rating: ReviewRating) => void;
  submitAnswer: (isCorrect: boolean) => void;
  skipItem: () => void;
}

export function useImmersiveSession({
  sessionType,
  limit = 20,
  initialItems,
}: UseImmersiveSessionOptions): UseImmersiveSessionResult {
  const queryClient = useQueryClient();
  
  // Store access
  const store = useSessionStore();
  const currentItem = useSessionStore(selectCurrentItem);
  const progress = useSessionStore(selectProgress);
  
  // Elapsed time (updates every second when active)
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Fetch due items if not provided
  const { data: fetchedItems, isLoading: isFetching } = useDueItems(
    'flashcards,quizzes',
    limit
  );
  
  // Graph reinforcement integration
  const { reinforceCorrect, reinforceIncorrect } = useReviewReinforcement();
  
  // Determine which items to use
  const items = initialItems || fetchedItems || [];
  const isLoading = !initialItems && isFetching;
  
  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (store.status === 'active' && store.sessionStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - store.sessionStartTime!);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [store.status, store.sessionStartTime]);
  
  // Start session
  const startSession = useCallback(() => {
    if (items.length === 0) {
      store.setError('No items available for session');
      return;
    }
    store.startSession(items, sessionType);
  }, [items, sessionType, store]);
  
  // Auto-start if items are available and session not started
  useEffect(() => {
    if (items.length > 0 && store.status === 'idle') {
      startSession();
    }
  }, [items.length, store.status, startSession]);
  
  // Flip card
  const flipCard = useCallback(() => {
    store.flipCard();
  }, [store]);
  
  // Submit SM-2 rating (for flashcards)
  const submitRating = useCallback((rating: ReviewRating) => {
    if (!currentItem) return;
    
    const isCorrect = rating >= 2; // Good (2) or Easy (3) = correct
    store.recordAnswer(isCorrect, rating);
    
    // Graph reinforcement
    if (isCorrect) {
      reinforceCorrect(currentItem);
    } else {
      reinforceIncorrect(currentItem);
    }
    
    // Move to next item
    store.nextItem();
  }, [currentItem, store, reinforceCorrect, reinforceIncorrect]);
  
  // Submit binary answer (for quizzes)
  const submitAnswer = useCallback((isCorrect: boolean) => {
    if (!currentItem) return;
    
    store.recordAnswer(isCorrect);
    
    // Graph reinforcement
    if (isCorrect) {
      reinforceCorrect(currentItem);
    } else {
      reinforceIncorrect(currentItem);
    }
    
    // Move to next item
    store.nextItem();
  }, [currentItem, store, reinforceCorrect, reinforceIncorrect]);
  
  // Skip item
  const skipItem = useCallback(() => {
    store.skipItem();
  }, [store]);
  
  // End session
  const endSession = useCallback(() => {
    const result = store.endSession();
    
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['study', 'due-items'] });
    
    return result;
  }, [store, queryClient]);
  
  return {
    isLoading,
    isActive: store.status === 'active',
    isComplete: store.status === 'complete',
    isPaused: store.status === 'paused',
    error: store.error,
    
    currentItem,
    isFlipped: store.isFlipped,
    
    progress,
    elapsedTime,
    
    startSession,
    pauseSession: store.pauseSession,
    resumeSession: store.resumeSession,
    endSession,
    
    flipCard,
    submitRating,
    submitAnswer,
    skipItem,
  };
}
