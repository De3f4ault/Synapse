import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RotateCcw, MousePointerClick, Keyboard } from 'lucide-react';
import type { FlashcardResponse } from '@/api/generated';

/**
 * Enhanced 3D Card Flip Component
 *
 * Features:
 * - Smooth 3D perspective flip animation
 * - Depth effect with shadows
 * - Visual flip hints
 * - Keyboard shortcut indicator (Spacebar)
 * - Hover scale effect
 * - Card statistics display
 * - Learning state badge
 */

interface CardFlipProps {
    card: FlashcardResponse;
    isFlipped: boolean;
    onFlip: () => void;
}

export function CardFlip({ card, isFlipped, onFlip }: CardFlipProps) {
    // Get learning state color
    const getLearningStateColor = (state: string) => {
        switch (state) {
            case 'new':
                return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800';
            case 'learning':
                return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800';
            case 'review':
                return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800';
            case 'mastered':
                return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
        {/* 3D Container */}
        <div
        className="relative w-full h-96"
        style={{ perspective: '1000px' }}
        >
        <motion.div
        className="relative w-full h-full cursor-pointer"
        onClick={onFlip}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{
            duration: 0.6,
            type: 'spring',
            stiffness: 100,
            damping: 15,
        }}
        style={{ transformStyle: 'preserve-3d' }}
        whileHover={{ scale: 1.02 }}
        >
        {/* Front Side */}
        <motion.div
        className="absolute inset-0"
        style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(0deg)',
        }}
        >
        <Card
        className={cn(
            'w-full h-full flex flex-col items-center justify-center p-8',
            'bg-gradient-to-br from-primary/5 to-secondary/5',
            'shadow-xl border-2',
            'transition-shadow duration-300',
            !isFlipped && 'hover:shadow-2xl'
        )}
        >
        {/* Learning State Badge */}
        <div className="absolute top-4 left-4">
        <Badge
        variant="outline"
        className={cn('font-medium', getLearningStateColor(card.learning_state))}
        >
        {card.learning_state}
        </Badge>
        </div>

        {/* Front Content */}
        <div className="text-center flex-1 flex flex-col items-center justify-center">
        <p className="text-sm text-muted-foreground mb-4 font-medium">
        Front
        </p>
        <motion.p
        className="text-2xl font-medium max-w-lg"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        >
        {card.front_text}
        </motion.p>
        {card.front_media_url && (
            <motion.img
            src={card.front_media_url}
            alt="Front media"
            className="mt-6 max-h-48 mx-auto rounded-md shadow-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            />
        )}
        </div>

        {/* Flip Hint */}
        <motion.div
        className="flex flex-col items-center gap-2 text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        >
        <div className="flex items-center gap-2">
        <MousePointerClick className="h-4 w-4" />
        <span>Click to flip</span>
        </div>
        <div className="flex items-center gap-2">
        <Keyboard className="h-3 w-3" />
        <span className="text-xs">or press</span>
        <kbd className="px-2 py-0.5 text-xs font-semibold bg-muted border rounded">
        Space
        </kbd>
        </div>
        </motion.div>
        </Card>
        </motion.div>

        {/* Back Side */}
        <motion.div
        className="absolute inset-0"
        style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
        }}
        >
        <Card
        className={cn(
            'w-full h-full flex flex-col items-center justify-center p-8',
            'bg-gradient-to-br from-secondary/5 to-primary/5',
            'shadow-xl border-2',
            'transition-shadow duration-300',
            isFlipped && 'hover:shadow-2xl'
        )}
        >
        {/* Difficulty Indicator */}
        <div className="absolute top-4 left-4">
        <Badge
        variant="outline"
        className={cn(
            'font-medium',
            parseFloat(card.ease_factor) >= 2.5
            ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300'
        : parseFloat(card.ease_factor) >= 2.0
        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300'
        : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300'
        )}
        >
        {parseFloat(card.ease_factor) >= 2.5
            ? 'Easy'
    : parseFloat(card.ease_factor) >= 2.0
    ? 'Medium'
    : 'Hard'}
    </Badge>
    </div>

    {/* Back Content */}
    <div className="text-center flex-1 flex flex-col items-center justify-center">
    <p className="text-sm text-muted-foreground mb-4 font-medium">
    Back
    </p>
    <motion.p
    className="text-2xl font-medium max-w-lg"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 }}
    >
    {card.back_text}
    </motion.p>
    {card.back_media_url && (
        <motion.img
        src={card.back_media_url}
        alt="Back media"
        className="mt-6 max-h-48 mx-auto rounded-md shadow-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        />
    )}
    </div>

    {/* Swipe Hint */}
    <motion.div
    className="flex items-center gap-2 text-sm text-muted-foreground"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.5 }}
    >
    <RotateCcw className="h-4 w-4" />
    <span>Swipe to rate your recall</span>
    </motion.div>
    </Card>
    </motion.div>
    </motion.div>
    </div>

    {/* Card Statistics */}
    <motion.div
    className="flex justify-between items-center text-sm text-muted-foreground mt-6 px-4"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.7 }}
    >
    <div className="flex items-center gap-1">
    <span className="font-medium">Reviews:</span>
    <span className="text-foreground font-semibold">
    {card.times_reviewed}
    </span>
    </div>

    <div className="flex items-center gap-1">
    <span className="font-medium">Accuracy:</span>
    <span
    className={cn(
        'font-semibold',
        card.accuracy >= 0.85
        ? 'text-green-600 dark:text-green-500'
    : card.accuracy >= 0.7
    ? 'text-amber-600 dark:text-amber-500'
    : 'text-red-600 dark:text-red-500'
    )}
    >
    {(card.accuracy * 100).toFixed(1)}%
    </span>
    </div>

    <div className="flex items-center gap-1">
    <span className="font-medium">Ease:</span>
    <span
    className={cn(
        'font-semibold',
        parseFloat(card.ease_factor) >= 2.5
        ? 'text-green-600 dark:text-green-500'
    : parseFloat(card.ease_factor) >= 2.0
    ? 'text-amber-600 dark:text-amber-500'
    : 'text-red-600 dark:text-red-500'
    )}
    >
    {card.ease_factor}
    </span>
    </div>

    <div className="flex items-center gap-1">
    <span className="font-medium">Interval:</span>
    <span className="text-foreground font-semibold">
    {card.interval}d
    </span>
    </div>
    </motion.div>
    </div>
    );
}
