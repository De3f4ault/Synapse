import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { StatCard, StatCardGrid } from '@/components/common/StatCard';
import { motion } from 'framer-motion';
import { BookOpen, TrendingUp, Clock, Target, Brain, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DeckResponse, FlashcardResponse } from '@/api/generated/types.gen';

/**
 * Enhanced Deck Statistics Component
 *
 * Shows comprehensive deck analytics:
 * - Animated stat cards with icons
 * - Learning state breakdown with progress bars
 * - Visual mastery indicators
 * - Color-coded learning states
 * - Smooth animations on mount
 */

interface DeckStatsProps {
    deck: DeckResponse;
    cards?: FlashcardResponse[];
    isLoading?: boolean;
}

export function DeckStats({ deck, cards = [], isLoading }: DeckStatsProps) {
    // Calculate statistics
    const stats = calculateStats(cards);

    return (
        <div className="space-y-6">
        {/* Primary Stats - Animated Cards */}
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        >
        <StatCardGrid columns={4}>
        {/* Total Cards */}
        <StatCard
        title="Total Cards"
        value={deck.card_count}
        icon={BookOpen}
        variant="primary"
        loading={isLoading}
        trend={
            stats.new > 0
            ? {
                value: Math.round((stats.new / deck.card_count) * 100),
            label: 'new cards',
            isPositive: true,
            }
            : undefined
        }
        />

        {/* Due Cards */}
        <StatCard
        title="Due for Review"
        value={stats.due}
        icon={Clock}
        variant={stats.due > 0 ? 'warning' : 'success'}
        loading={isLoading}
        action={
            stats.due > 0
            ? {
                label: 'Start Review',
                icon: Zap,
                onClick: () => {
                    // Navigation handled by parent
                },
            }
            : undefined
        }
        />

        {/* Accuracy */}
        <StatCard
        title="Avg. Accuracy"
        value={stats.avgAccuracy * 100}
        icon={Target}
        variant={
            stats.avgAccuracy >= 0.85
            ? 'success'
    : stats.avgAccuracy >= 0.7
    ? 'warning'
    : 'destructive'
        }
        suffix="%"
        decimals={1}
        loading={isLoading}
        trend={{
            value: stats.avgAccuracy * 100,
            label: 'overall',
            isPositive: stats.avgAccuracy >= 0.7,
        }}
        />

        {/* Mastery */}
        <StatCard
        title="Mastered Cards"
        value={stats.mastered}
        icon={TrendingUp}
        variant="success"
        loading={isLoading}
        trend={{
            value:
            deck.card_count > 0
            ? Math.round((stats.mastered / deck.card_count) * 100)
            : 0,
            label: 'of total',
            isPositive: true,
        }}
        />
        </StatCardGrid>
        </motion.div>

        {/* Learning State Breakdown */}
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        >
        <Card>
        <CardHeader>
        <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <CardTitle>Learning Progress</CardTitle>
        </div>
        </CardHeader>
        <CardContent>
        <div className="space-y-6">
        {/* New Cards */}
        <LearningStateBar
        label="New"
        count={stats.new}
        total={deck.card_count}
        color="blue"
        description="Cards you haven't studied yet"
        delay={0}
        />

        {/* Learning Cards */}
        <LearningStateBar
        label="Learning"
        count={stats.learning}
        total={deck.card_count}
        color="amber"
        description="Cards in active learning phase"
        delay={0.1}
        />

        {/* Review Cards */}
        <LearningStateBar
        label="Review"
        count={stats.review}
        total={deck.card_count}
        color="orange"
        description="Cards awaiting periodic review"
        delay={0.2}
        />

        {/* Mastered Cards */}
        <LearningStateBar
        label="Mastered"
        count={stats.mastered}
        total={deck.card_count}
        color="green"
        description="Fully learned cards with high accuracy"
        delay={0.3}
        />
        </div>

        {/* Summary */}
        {deck.card_count === 0 ? (
            <div className="mt-6 p-4 rounded-lg bg-muted text-center">
            <p className="text-sm text-muted-foreground">
            Add cards to this deck to start learning
            </p>
            </div>
        ) : stats.mastered === deck.card_count ? (
            <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <TrendingUp className="h-4 w-4" />
            <p className="text-sm font-medium">
            Congratulations! You've mastered all cards in this deck! 🎉
            </p>
            </div>
            </div>
        ) : stats.due > 0 ? (
            <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <Clock className="h-4 w-4" />
            <p className="text-sm font-medium">
            {stats.due} {stats.due === 1 ? 'card' : 'cards'} ready for
            review
            </p>
            </div>
            </div>
        ) : null}
        </CardContent>
        </Card>
        </motion.div>
        </div>
    );
}

/**
 * Learning State Progress Bar Component
 */
interface LearningStateBarProps {
    label: string;
    count: number;
    total: number;
    color: 'blue' | 'amber' | 'orange' | 'green';
    description: string;
    delay: number;
}

function LearningStateBar({
    label,
    count,
    total,
    color,
    description,
    delay,
}: LearningStateBarProps) {
    const percentage = total > 0 ? (count / total) * 100 : 0;

    const colorStyles = {
        blue: {
            badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800',
            progress: 'bg-blue-500',
        },
        amber: {
            badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800',
            progress: 'bg-amber-500',
        },
        orange: {
            badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800',
            progress: 'bg-orange-500',
        },
        green: {
            badge: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800',
            progress: 'bg-green-500',
        },
    };

    return (
        <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay }}
        >
        <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
        <Badge variant="outline" className={cn('font-medium', colorStyles[color].badge)}>
        {label}
        </Badge>
        <span className="text-sm font-medium">
        {count} {count === 1 ? 'card' : 'cards'}
        </span>
        </div>
        <motion.span
        className="text-sm font-semibold"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.5 }}
        >
        {percentage.toFixed(0)}%
        </motion.span>
        </div>

        <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: delay + 0.2, ease: 'easeOut' }}
        className="origin-left"
        >
        <Progress value={percentage} className="h-2" indicatorClassName={colorStyles[color].progress} />
        </motion.div>

        <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </motion.div>
    );
}

/**
 * Helper function to calculate statistics
 */
function calculateStats(cards: FlashcardResponse[]) {
    const now = new Date();

    return cards.reduce(
        (acc, card) => {
            // Count learning states
            if (card.learning_state === 'new') acc.new++;
            if (card.learning_state === 'learning') acc.learning++;
            if (card.learning_state === 'review') acc.review++;
            if (card.learning_state === 'mastered') acc.mastered++;

            // Count due cards
            if (card.next_review && new Date(card.next_review) <= now) {
                acc.due++;
            }

            // Sum accuracy
            acc.totalAccuracy += card.accuracy;

            return acc;
        },
        {
            new: 0,
            learning: 0,
            review: 0,
            mastered: 0,
            due: 0,
            totalAccuracy: 0,
            avgAccuracy:
            cards.length > 0
            ? cards.reduce((sum, card) => sum + card.accuracy, 0) / cards.length
            : 0,
        }
    );
}
