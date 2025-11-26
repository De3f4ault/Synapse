import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Trophy,
    Share2,
    Sparkles,
    Star,
    Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import type { MilestoneAchievement } from '../../types/intelligence.types';

interface MilestoneCardProps {
    milestone: MilestoneAchievement;
    onShare?: () => void;
}

/**
 * MilestoneCard - Celebrate achievements and breakthroughs
 *
 * Features:
 * - Celebration animations (confetti-style)
 * - Achievement level badges (common, rare, epic, legendary)
 * - Share functionality
 * - Value display with formatting
 * - Icon animations
 */
export function MilestoneCard({ milestone, onShare }: MilestoneCardProps) {
    const levelColors = getLevelColors(milestone.level);

    return (
        <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
            duration: 0.5,
            type: 'spring',
            bounce: 0.4
        }}
        >
        <Card className={cn(
            'relative overflow-hidden',
            'border-2 shadow-lg hover:shadow-xl transition-all',
            levelColors.border
        )}>
        {/* Animated Background */}
        <div className={cn(
            'absolute inset-0 opacity-10',
            levelColors.gradient
        )} />

        {/* Sparkle Decorations */}
        <motion.div
        className="absolute top-4 right-4"
        animate={{
            rotate: [0, 360],
            scale: [1, 1.2, 1]
        }}
        transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear'
        }}
        >
        <Sparkles className={cn('h-6 w-6', levelColors.icon)} />
        </motion.div>

        <CardContent className="relative p-6 space-y-4">
        {/* Achievement Badge */}
        <div className="flex items-center justify-between">
        <Badge
        className={cn(
            'text-xs font-bold px-3 py-1',
            levelColors.badge
        )}
        >
        {milestone.level.toUpperCase()}
        </Badge>

        <motion.div
        animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 15, -15, 0]
        }}
        transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 2
        }}
        >
        {getLevelIcon(milestone.level)}
        </motion.div>
        </div>

        {/* Main Content */}
        <div className="text-center space-y-2">
        {/* Large Emoji Icon */}
        <motion.div
        className="text-6xl"
        animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
        }}
        transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatDelay: 1
        }}
        >
        {milestone.icon}
        </motion.div>

        {/* Title */}
        <h3 className="text-2xl font-bold">
        {milestone.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground">
        {milestone.description}
        </p>

        {/* Value Display */}
        {milestone.value && (
            <div className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold',
                levelColors.valueBg
            )}>
            <Star className="h-4 w-4" />
            <span>{formatMilestoneValue(milestone)}</span>
            </div>
        )}
        </div>

        {/* Timestamp */}
        <p className="text-xs text-center text-muted-foreground">
        Achieved {formatRelativeTime(milestone.timestamp)}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-2">
        <Button
        variant="outline"
        size="sm"
        className="flex-1"
        onClick={onShare}
        >
        <Share2 className="mr-2 h-4 w-4" />
        Share
        </Button>
        <Button
        variant="outline"
        size="sm"
        className="flex-1"
        onClick={() => {
            window.location.href = '/analytics';
        }}
        >
        <Trophy className="mr-2 h-4 w-4" />
        View Stats
        </Button>
        </div>
        </CardContent>

        {/* Celebration Particles (CSS animation) */}
        <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
            key={i}
            className={cn(
                'absolute w-2 h-2 rounded-full',
                levelColors.particle
            )}
            initial={{
                x: '50%',
                y: '50%',
                scale: 0
            }}
            animate={{
                x: `${50 + (Math.random() - 0.5) * 100}%`,
                                                  y: `${50 + (Math.random() - 0.5) * 100}%`,
                                                  scale: [0, 1, 0],
                                                  opacity: [0, 1, 0]
            }}
            transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
                ease: 'easeOut'
            }}
            />
        ))}
        </div>
        </Card>
        </motion.div>
    );
}

// Get color scheme based on achievement level
function getLevelColors(level: string) {
    switch (level) {
        case 'legendary':
            return {
                border: 'border-purple-500',
                gradient: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500',
                badge: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0',
                icon: 'text-purple-600',
                valueBg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
                particle: 'bg-purple-500',
            };
        case 'epic':
            return {
                border: 'border-blue-500',
                gradient: 'bg-gradient-to-br from-blue-500 to-cyan-500',
                badge: 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0',
                icon: 'text-blue-600',
                valueBg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
                particle: 'bg-blue-500',
            };
        case 'rare':
            return {
                border: 'border-green-500',
                gradient: 'bg-gradient-to-br from-green-500 to-emerald-500',
                badge: 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0',
                icon: 'text-green-600',
                valueBg: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
                particle: 'bg-green-500',
            };
        default: // common
            return {
                border: 'border-gray-400',
                gradient: 'bg-gradient-to-br from-gray-400 to-gray-500',
                badge: 'bg-gradient-to-r from-gray-600 to-gray-700 text-white border-0',
                icon: 'text-gray-600',
                valueBg: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
                particle: 'bg-gray-500',
            };
    }
}

// Get icon based on level
function getLevelIcon(level: string) {
    switch (level) {
        case 'legendary':
            return <Trophy className="h-8 w-8 text-purple-600" />;
        case 'epic':
            return <Award className="h-8 w-8 text-blue-600" />;
        case 'rare':
            return <Star className="h-8 w-8 text-green-600" />;
        default:
            return <Badge className="h-8 w-8 text-gray-600" />;
    }
}

// Format milestone value for display
function formatMilestoneValue(milestone: MilestoneAchievement): string {
    switch (milestone.type) {
        case 'streak':
            return `${milestone.value} days`;
        case 'mastery':
            return `${(milestone.value * 100).toFixed(0)}% accuracy`;
        case 'volume':
            return `${milestone.value.toLocaleString()} reviews`;
        case 'productivity':
            return `${milestone.value} cards today`;
        default:
            return `${milestone.value}`;
    }
}
