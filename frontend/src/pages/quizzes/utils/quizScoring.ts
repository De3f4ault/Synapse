import type { RankInfo } from '../types/quizzes.types';

/**
 * Calculate rank based on percentage score
 */
export function calculateRank(percentage: number): RankInfo {
    if (percentage >= 95) {
        return {
            grade: 'S',
            color: 'text-yellow-400',
            glow: 'shadow-yellow-500/50',
        };
    }
    if (percentage >= 85) {
        return {
            grade: 'A',
            color: 'text-emerald-400',
            glow: 'shadow-emerald-500/50',
        };
    }
    if (percentage >= 75) {
        return {
            grade: 'B',
            color: 'text-cyan-400',
            glow: 'shadow-cyan-500/50',
        };
    }
    if (percentage >= 60) {
        return {
            grade: 'C',
            color: 'text-purple-400',
            glow: 'shadow-purple-500/50',
        };
    }
    return {
        grade: 'D',
        color: 'text-red-400',
        glow: 'shadow-red-500/50',
    };
}

/**
 * Calculate score from correct answers
 */
export function calculateScore(
    correctAnswers: number,
    totalQuestions: number
): { score: number; percentage: number } {
    if (totalQuestions === 0) {
        return { score: 0, percentage: 0 };
    }

    const percentage = (correctAnswers / totalQuestions) * 100;
    const score = correctAnswers * 10; // 10 points per correct answer

    return { score, percentage };
}

/**
 * Calculate bonus points for streak
 */
export function calculateStreakBonus(streak: number): number {
    if (streak < 3) return 0;
    if (streak < 5) return 5;
    if (streak < 10) return 10;
    return 20;
}

/**
 * Calculate time bonus (faster = more points)
 */
export function calculateTimeBonus(
    elapsedSeconds: number,
    timeLimitMinutes?: number
): number {
    if (!timeLimitMinutes) return 0;

    const timeLimitSeconds = timeLimitMinutes * 60;
    const timeUsedPercentage = (elapsedSeconds / timeLimitSeconds) * 100;

    // Bonus for completing under 50% of time limit
    if (timeUsedPercentage < 50) return 15;
    if (timeUsedPercentage < 75) return 10;
    if (timeUsedPercentage < 90) return 5;

    return 0;
}

/**
 * Calculate final score with all bonuses
 */
export function calculateFinalScore(
    correctAnswers: number,
    totalQuestions: number,
    maxStreak: number,
    elapsedSeconds: number,
    timeLimitMinutes?: number
): {
    baseScore: number;
    streakBonus: number;
    timeBonus: number;
    finalScore: number;
    percentage: number;
} {
    const { score: baseScore, percentage } = calculateScore(correctAnswers, totalQuestions);
    const streakBonus = calculateStreakBonus(maxStreak);
    const timeBonus = calculateTimeBonus(elapsedSeconds, timeLimitMinutes);
    const finalScore = baseScore + streakBonus + timeBonus;

    return {
        baseScore,
        streakBonus,
        timeBonus,
        finalScore,
        percentage,
    };
}

/**
 * Parse quiz score from API response
 */
export function parseScore(score: string | number): number {
    if (typeof score === 'number') return score;
    return parseFloat(score) || 0;
}
