/**
 * DarkCard Component
 * 
 * Solid dark container for flashcards module.
 * This is the ONLY container component allowed in flashcards.
 * 
 * @visual-constraints (per FLASHCARDS_ARCHITECTURE.md)
 * - ❌ No gradients
 * - ❌ No backdrop-filter / blur
 * - ❌ No opacity layers > 0.95
 * - ❌ No nested shadows
 * - ✅ Solid background: bg-[#0a0a0f]
 * - ✅ Single subtle border: border border-white/10
 * - ✅ Minimal hover state (brightness shift only)
 */

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DarkCardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    /** Enable hover brightness effect */
    hoverable?: boolean;
    /** Additional padding preset */
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
};

export const DarkCard = forwardRef<HTMLDivElement, DarkCardProps>(
    ({ children, hoverable = false, padding = 'md', className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    // Base styles
                    'bg-[#0a0a0f] border border-white/10 rounded-2xl',
                    // Padding
                    paddingClasses[padding],
                    // Hover state (optional)
                    hoverable && 'transition-colors hover:border-white/20',
                    // Custom classes
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

DarkCard.displayName = 'DarkCard';
