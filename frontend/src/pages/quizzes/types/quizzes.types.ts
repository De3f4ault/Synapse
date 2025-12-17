import type { QuizAttemptStart } from '@/api/generated';

export interface RankInfo {
    grade: string;
    color: string;
    glow: string;
}

export type GameState = 'LOADING' | 'ACTIVE' | 'REVIEW' | 'END';

export interface QuizAttemptState {
    attemptData: QuizAttemptStart | null;
    currentIdx: number;
    answers: Map<number, string>; // questionId -> answer
    streak: number;
    maxStreak: number;
    startTime: number;
    elapsedTime: number;
}
