/**
 * Session Store - Zustand state management for study sessions
 * 
 * Single Responsibility: Manage session state (current item, progress, timing)
 * 
 * Following the pattern from flashcards/study/state/studyStore.ts
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { StudyItem } from '../../core/engine/types';

// Local session result type (simpler than API response)
export interface SessionResult {
  completed: number;
  correct: number;
  incorrect: number;
  skipped: number;
  averageTime: number;
  totalTime: number;
}

// Session status enum
export type SessionStatus = 'idle' | 'active' | 'paused' | 'complete';

// Session state interface
export interface SessionState {
  // Session metadata
  status: SessionStatus;
  sessionType: 'due' | 'recommended' | 'mixed';
  sessionStartTime: number | null;
  
  // Queue management
  queue: StudyItem[];
  currentIndex: number;
  
  // Current item state
  isFlipped: boolean;
  itemStartTime: number | null;
  
  // Results tracking
  answers: Array<{
    itemId: number;
    isCorrect: boolean;
    rating?: number;
    timeTakenMs: number;
  }>;
  
  // Error state
  error: string | null;
}

// Session actions interface
export interface SessionActions {
  // Lifecycle
  startSession: (items: StudyItem[], type: 'due' | 'recommended' | 'mixed') => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => SessionResult;
  resetSession: () => void;
  
  // Navigation
  nextItem: () => boolean;
  skipItem: () => void;
  
  // Card interaction
  flipCard: () => void;
  recordAnswer: (isCorrect: boolean, rating?: number) => void;
  
  // Getters
  getCurrentItem: () => StudyItem | null;
  getProgress: () => { current: number; total: number; percentage: number };
  getElapsedTime: () => number;
  
  // Error handling
  setError: (error: string | null) => void;
}

// Initial state
const initialState: SessionState = {
  status: 'idle',
  sessionType: 'mixed',
  sessionStartTime: null,
  queue: [],
  currentIndex: 0,
  isFlipped: false,
  itemStartTime: null,
  answers: [],
  error: null,
};

// Create the store
export const useSessionStore = create<SessionState & SessionActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Start a new session
      startSession: (items, type) => {
        if (items.length === 0) {
          set({ error: 'No items available for session' });
          return;
        }
        
        const now = Date.now();
        set({
          status: 'active',
          sessionType: type,
          sessionStartTime: now,
          queue: items,
          currentIndex: 0,
          isFlipped: false,
          itemStartTime: now,
          answers: [],
          error: null,
        });
      },

      // Pause session
      pauseSession: () => {
        set({ status: 'paused' });
      },

      // Resume session
      resumeSession: () => {
        set({ status: 'active' });
      },

      // End session and return stats
      endSession: () => {
        const state = get();
        const elapsedMs = state.sessionStartTime 
          ? Date.now() - state.sessionStartTime 
          : 0;
        
        const correctCount = state.answers.filter(a => a.isCorrect).length;
        const totalAnswered = state.answers.length;
        
        const result: SessionResult = {
          completed: state.currentIndex,
          correct: correctCount,
          incorrect: totalAnswered - correctCount,
          skipped: state.queue.length - totalAnswered,
          averageTime: totalAnswered > 0 
            ? Math.round(state.answers.reduce((sum, a) => sum + a.timeTakenMs, 0) / totalAnswered)
            : 0,
          totalTime: elapsedMs,
        };
        
        set({ ...initialState, status: 'complete' });
        return result;
      },

      // Reset to initial state
      resetSession: () => {
        set(initialState);
      },

      // Move to next item
      nextItem: () => {
        const state = get();
        const nextIndex = state.currentIndex + 1;
        
        if (nextIndex >= state.queue.length) {
          set({ status: 'complete' });
          return false;
        }
        
        set({
          currentIndex: nextIndex,
          isFlipped: false,
          itemStartTime: Date.now(),
        });
        return true;
      },

      // Skip current item without recording
      skipItem: () => {
        const state = get();
        const nextIndex = state.currentIndex + 1;
        
        if (nextIndex >= state.queue.length) {
          set({ status: 'complete' });
          return;
        }
        
        set({
          currentIndex: nextIndex,
          isFlipped: false,
          itemStartTime: Date.now(),
        });
      },

      // Flip the current card
      flipCard: () => {
        set(state => ({ isFlipped: !state.isFlipped }));
      },

      // Record an answer
      recordAnswer: (isCorrect, rating) => {
        const state = get();
        const currentItem = state.queue[state.currentIndex];
        if (!currentItem) return;
        
        const timeTakenMs = state.itemStartTime 
          ? Date.now() - state.itemStartTime 
          : 0;
        
        set(state => ({
          answers: [
            ...state.answers,
            {
              itemId: currentItem.id,
              isCorrect,
              rating,
              timeTakenMs,
            },
          ],
        }));
      },

      // Get current item
      getCurrentItem: () => {
        const state = get();
        return state.queue[state.currentIndex] || null;
      },

      // Get progress
      getProgress: () => {
        const state = get();
        const total = state.queue.length;
        const current = state.currentIndex + 1;
        return {
          current,
          total,
          percentage: total > 0 ? Math.round((current / total) * 100) : 0,
        };
      },

      // Get elapsed time
      getElapsedTime: () => {
        const state = get();
        return state.sessionStartTime 
          ? Date.now() - state.sessionStartTime 
          : 0;
      },

      // Set error
      setError: (error) => {
        set({ error });
      },
    }),
    { name: 'session-store' }
  )
);

// Selectors for common patterns
export const selectCurrentItem = (state: SessionState & SessionActions) => 
  state.queue[state.currentIndex] || null;

export const selectProgress = (state: SessionState & SessionActions) => ({
  current: state.currentIndex + 1,
  total: state.queue.length,
  percentage: state.queue.length > 0 
    ? Math.round(((state.currentIndex + 1) / state.queue.length) * 100) 
    : 0,
});

export const selectIsActive = (state: SessionState & SessionActions) => 
  state.status === 'active';

export const selectIsComplete = (state: SessionState & SessionActions) => 
  state.status === 'complete';
