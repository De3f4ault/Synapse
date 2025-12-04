// TODO: Implement SwipeGesture
/**
 * SwipeGesture Component
 * Wrapper for swipe-based card review (mobile-friendly)
 */

import { ReactNode } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import type { ReviewQuality } from '../../types/flashcards.types';

interface SwipeGestureProps {
    children: ReactNode;
    onSwipe: (quality: ReviewQuality) => void;
    isEnabled: boolean;
}

export function SwipeGesture({ children, onSwipe, isEnabled }: SwipeGestureProps) {
    const x = useMotionValue(0);
    const rotateZ = useTransform(x, [-200, 200], [-15, 15]);
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

    const handleDragEnd = () => {
        const threshold = 100;
        const currentX = x.get();

        if (!isEnabled) {
            x.set(0);
            return;
        }

        if (Math.abs(currentX) > threshold) {
            if (currentX < -threshold) {
                // Swipe left = Again
                onSwipe('again');
            } else if (currentX > threshold) {
                // Swipe right = Easy
                onSwipe('easy');
            }
        } else {
            x.set(0);
        }
    };

    return (
        <motion.div
        style={{ x, rotateZ, opacity }}
        drag={isEnabled ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        className="w-full"
        >
        {children}
        </motion.div>
    );
}
