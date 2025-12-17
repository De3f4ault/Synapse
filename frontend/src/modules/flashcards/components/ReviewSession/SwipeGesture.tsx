import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { X, Check, Zap } from 'lucide-react';
import type { FlashcardResponse } from '@/api/generated';

/**
 * Enhanced Swipe Gesture Component
 *
 * Features:
 * - Smooth drag and swipe animations
 * - Visual feedback overlays (red/yellow/green)
 * - Button highlights sync with drag
 * - Quality rating zones (Again/Good/Easy)
 * - Confidence threshold detection
 * - Exit animation on commit
 * - Haptic feedback (if available)
 */

interface SwipeGestureProps {
    card: FlashcardResponse;
    onSwipe: (quality: number) => void;
    disabled?: boolean;
}

export function SwipeGesture({ card, onSwipe, disabled = false }: SwipeGestureProps) {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-300, 0, 300], [-15, 0, 15]);
    const opacity = useTransform(
        x,
        [-200, -150, 0, 150, 200],
        [0.7, 1, 1, 1, 0.7]
    );

    // Calculate quality from swipe distance
    const calculateQuality = (offsetX: number): number => {
        if (offsetX < -100) return 1; // Again (Hard)
        if (offsetX >= 100 && offsetX < 200) return 3; // Good
        if (offsetX >= 200) return 5; // Easy
        return 3; // Default to Good
    };

    // Get quality label for preview
    const getQualityLabel = (offsetX: number): string => {
        if (offsetX < -100) return 'Again';
        if (offsetX >= 100 && offsetX < 200) return 'Good';
        if (offsetX >= 200) return 'Easy';
        return '';
    };

    // Get overlay color and opacity based on swipe distance
    const getOverlayStyle = (offsetX: number) => {
        if (offsetX < -100) {
            return {
                color: 'bg-gradient-to-r from-red-500/20 to-transparent',
                opacity: Math.min(Math.abs(offsetX) / 200, 0.5),
            };
        }
        if (offsetX >= 100 && offsetX < 200) {
            return {
                color: 'bg-gradient-to-l from-amber-500/20 to-transparent',
                opacity: Math.min(offsetX / 200, 0.5),
            };
        }
        if (offsetX >= 200) {
            return {
                color: 'bg-gradient-to-l from-green-500/20 to-transparent',
                opacity: Math.min(offsetX / 300, 0.5),
            };
        }
        return { color: '', opacity: 0 };
    };

    // Trigger haptic feedback (if available)
    const triggerHaptic = () => {
        if ('vibrate' in navigator) {
            navigator.vibrate(10);
        }
    };

    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const threshold = 100;
        const offsetX = info.offset.x;

        if (Math.abs(offsetX) >= threshold) {
            const quality = calculateQuality(offsetX);
            triggerHaptic();
            onSwipe(quality);
            // The parent component will handle moving to next card
        } else {
            // Snap back if not enough swipe
            x.set(0);
        }
    };

    const currentOffset = x.get();
    const overlayStyle = getOverlayStyle(currentOffset);

    return (
        <div className="relative w-full max-w-2xl mx-auto h-96">
        {/* Swipe Hint Overlays */}
        <div className="absolute inset-0 flex items-center justify-between px-8 pointer-events-none z-0">
        {/* Left (Again) */}
        <motion.div
        className="flex flex-col items-center text-red-600 dark:text-red-500"
        animate={{
            scale: currentOffset < -100 ? [1, 1.2, 1] : 1,
            opacity: currentOffset < -50 ? 1 : 0.3,
        }}
        transition={{ duration: 0.3 }}
        >
        <X className="h-12 w-12 mb-2" strokeWidth={3} />
        <span className="text-sm font-bold">Again</span>
        <span className="text-xs text-muted-foreground mt-1">{`< 10m`}</span>
        </motion.div>

        {/* Center (Good) */}
        <motion.div
        className="flex flex-col items-center text-amber-600 dark:text-amber-500"
        animate={{
            scale: currentOffset >= 100 && currentOffset < 200 ? [1, 1.2, 1] : 1,
            opacity:
            currentOffset >= 50 && currentOffset < 200 ? 1 : 0.3,
        }}
        transition={{ duration: 0.3 }}
        >
        <Check className="h-10 w-10 mb-2" strokeWidth={3} />
        <span className="text-sm font-bold">Good</span>
        <span className="text-xs text-muted-foreground mt-1">~1 day</span>
        </motion.div>

        {/* Right (Easy) */}
        <motion.div
        className="flex flex-col items-center text-green-600 dark:text-green-500"
        animate={{
            scale: currentOffset >= 200 ? [1, 1.2, 1] : 1,
            opacity: currentOffset >= 150 ? 1 : 0.3,
        }}
        transition={{ duration: 0.3 }}
        >
        <Zap className="h-12 w-12 mb-2" strokeWidth={3} />
        <span className="text-sm font-bold">Easy</span>
        <span className="text-xs text-muted-foreground mt-1">~4 days</span>
        </motion.div>
        </div>

        {/* Draggable Card */}
        <motion.div
        className="absolute inset-0 z-10"
        drag={disabled ? false : 'x'}
        dragConstraints={{ left: -300, right: 300 }}
        dragElastic={0.2}
        style={{ x, rotate, opacity }}
        onDragEnd={handleDragEnd}
        whileDrag={{ cursor: 'grabbing' }}
        >
        <Card
        className={cn(
            'w-full h-full flex items-center justify-center p-8',
            'cursor-grab active:cursor-grabbing',
            'shadow-xl border-2',
            'bg-gradient-to-br from-secondary/5 to-primary/5',
            'relative overflow-hidden'
        )}
        >
        {/* Color Overlay */}
        <motion.div
        className={cn(
            'absolute inset-0 pointer-events-none',
            overlayStyle.color
        )}
        style={{ opacity: overlayStyle.opacity }}
        />

        {/* Card Content */}
        <div className="text-center relative z-10">
        {/* Learning State Badge */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2">
        <Badge variant="outline" className="font-medium">
        {card.learning_state}
        </Badge>
        </div>

        <p className="text-2xl font-medium mb-4 max-w-lg">
        {card.back_text}
        </p>

        {card.back_media_url && (
            <img
            src={card.back_media_url}
            alt="Card media"
            className="max-h-48 mx-auto rounded-md shadow-md"
            />
        )}

        {/* Quality Preview Indicator */}
        <motion.div
        className="mt-8"
        animate={{
            opacity: Math.abs(currentOffset) > 50 ? 1 : 0,
            scale: Math.abs(currentOffset) > 50 ? 1 : 0.8,
        }}
        transition={{ duration: 0.2 }}
        >
        <Badge
        variant="outline"
        className={cn(
            'text-base px-4 py-2 font-bold',
            currentOffset < -100 &&
            'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/30 dark:text-red-300',
            currentOffset >= 100 &&
            currentOffset < 200 &&
            'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300',
            currentOffset >= 200 &&
            'bg-green-50 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-300'
        )}
        >
        {getQualityLabel(currentOffset)}
        </Badge>
        </motion.div>
        </div>
        </Card>
        </motion.div>

        {/* Instructions */}
        <motion.div
        className="absolute -bottom-12 left-0 right-0 text-center text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        >
        <p>
        <span className="inline-flex items-center gap-1">
        <span className="font-medium text-red-600 dark:text-red-500">
        ← Again
        </span>
        <span className="text-xs">•</span>
        <span className="font-medium text-amber-600 dark:text-amber-500">
        Good →
        </span>
        <span className="text-xs">•</span>
        <span className="font-medium text-green-600 dark:text-green-500">
        Easy →→
        </span>
        </span>
        </p>
        </motion.div>

        {/* Progress Indicator (optional) */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted rounded-full overflow-hidden">
        <motion.div
        className={cn(
            'h-full',
            currentOffset < -100
            ? 'bg-red-500'
        : currentOffset >= 100 && currentOffset < 200
        ? 'bg-amber-500'
        : currentOffset >= 200
        ? 'bg-green-500'
        : 'bg-transparent'
        )}
        style={{
            width: `${Math.min((Math.abs(currentOffset) / 300) * 100, 100)}%`,
        }}
        />
        </div>
        </div>
    );
}
