import { useMediaQuery } from './useMediaQuery';

/**
 * usePrefersReducedMotion Hook
 *
 * Detects if user has enabled "reduce motion" in their OS/browser settings.
 * Respects accessibility preferences for users sensitive to animations.
 *
 * @returns boolean - true if user prefers reduced motion, false otherwise
 *
 * @example
 * const prefersReducedMotion = usePrefersReducedMotion();
 *
 * <motion.div
 *   animate={prefersReducedMotion ? {} : { scale: 1.2 }}
 * >
 *   Content
 * </motion.div>
 *
 * @example with conditional animation
 * const shouldAnimate = !prefersReducedMotion;
 *
 * if (shouldAnimate) {
 *   // Apply animations
 * }
 */

export function usePrefersReducedMotion(): boolean {
    return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/**
 * useShouldAnimate Hook
 *
 * Convenience hook that combines user's OS preference with app settings.
 * Returns whether animations should be enabled.
 *
 * @param enableAnimations - App-level animation setting (from preferences store)
 * @returns boolean - true if animations should be enabled
 *
 * @example
 * const showAnimations = usePreferencesStore(s => s.showAnimations);
 * const shouldAnimate = useShouldAnimate(showAnimations);
 *
 * <motion.div animate={shouldAnimate ? { x: 100 } : {}}>
 *   Content
 * </motion.div>
 */
export function useShouldAnimate(enableAnimations: boolean = true): boolean {
    const prefersReducedMotion = usePrefersReducedMotion();

    // Animations should only be enabled if:
    // 1. User hasn't requested reduced motion AND
    // 2. App setting allows animations
    return !prefersReducedMotion && enableAnimations;
}
