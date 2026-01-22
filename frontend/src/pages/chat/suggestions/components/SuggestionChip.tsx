/**
 * SuggestionChip - Non-Intrusive Advisory UI
 *
 * Shows suggestion signals as dismissible chips.
 * Never blocks input. Never auto-executes.
 *
 * UX principles:
 * - Show once per message
 * - Dismissible
 * - Explains why it exists
 * - User chooses → action or ignore
 */

import { X, GitBranch, MessageSquarePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { SuggestionSignal } from '../types';

interface SuggestionChipProps {
    suggestion: SuggestionSignal;
    onAccept: () => void;
    onDismiss: () => void;
    className?: string;
}

export function SuggestionChip({
    suggestion,
    onAccept,
    onDismiss,
    className,
}: SuggestionChipProps) {
    const isThread = suggestion.type === 'START_THREAD';
    const Icon = isThread ? MessageSquarePlus : GitBranch;
    const actionLabel = isThread ? 'Start thread' : 'Try alternative';
    const accentColor = isThread ? 'cyan' : 'purple';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl',
                'bg-zinc-900/60 border border-white/5',
                'backdrop-blur-sm shadow-lg',
                'text-sm',
                className
            )}
        >
            {/* Icon */}
            <Icon
                className={cn(
                    'size-4 shrink-0',
                    accentColor === 'cyan' ? 'text-cyan-400' : 'text-purple-400'
                )}
            />

            {/* Reason text */}
            <span className="text-muted-foreground text-xs leading-snug flex-1 min-w-0">
                {suggestion.reason}
            </span>

            {/* Accept button */}
            <button
                onClick={onAccept}
                className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium',
                    'transition-all duration-150',
                    accentColor === 'cyan'
                        ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
                        : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                )}
            >
                {actionLabel}
            </button>

            {/* Dismiss button */}
            <button
                onClick={onDismiss}
                className="p-1 rounded-full text-muted-foreground/40 hover:text-muted-foreground hover:bg-white/5 transition-colors"
                aria-label="Dismiss suggestion"
            >
                <X className="size-3.5" />
            </button>
        </motion.div>
    );
}

/**
 * SuggestionChipList - Renders multiple suggestions with animation.
 */
interface SuggestionChipListProps {
    suggestions: SuggestionSignal[];
    onAccept: (suggestion: SuggestionSignal) => void;
    onDismiss: (suggestion: SuggestionSignal) => void;
    className?: string;
}

export function SuggestionChipList({
    suggestions,
    onAccept,
    onDismiss,
    className,
}: SuggestionChipListProps) {
    if (suggestions.length === 0) return null;

    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <AnimatePresence mode="popLayout">
                {suggestions.map((suggestion) => (
                    <SuggestionChip
                        key={`${suggestion.type}-${suggestion.anchorMessageId}`}
                        suggestion={suggestion}
                        onAccept={() => onAccept(suggestion)}
                        onDismiss={() => onDismiss(suggestion)}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}
