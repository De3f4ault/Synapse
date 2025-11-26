import { Badge } from '@/components/ui/badge';
import { MODULE_COLORS } from '../../constants/colors';
import { FileText, BookOpen, CreditCard, MessageSquare, ClipboardList, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type ModuleType = 'document' | 'note' | 'flashcard' | 'chat' | 'quiz';

interface ModuleBadgeProps {
    type: ModuleType;
    className?: string;
    showIcon?: boolean;
}

const MODULE_ICONS: Record<ModuleType, LucideIcon> = {
    document: FileText,
    note: BookOpen,
    flashcard: CreditCard,
    chat: MessageSquare,
    quiz: ClipboardList,
};

const MODULE_LABELS: Record<ModuleType, string> = {
    document: 'Document',
    note: 'Note',
    flashcard: 'Flashcard',
    chat: 'Chat',
    quiz: 'Quiz',
};

/**
 * Badge component for displaying module type
 * Color-coded by module with optional icon
 *
 * DEFENSIVE: Falls back to neutral colors if type is invalid
 */
export function ModuleBadge({ type, className, showIcon = true }: ModuleBadgeProps) {
    // CRITICAL FIX: Defensive check for invalid types
    // If type is undefined or not a valid module type, use flashcard as default
    const safeType: ModuleType = type && type in MODULE_COLORS ? type : 'flashcard';

    const Icon = MODULE_ICONS[safeType];
    const colors = MODULE_COLORS[safeType];
    const label = MODULE_LABELS[safeType];

    // Additional safety check - should never happen but prevents crashes
    if (!colors) {
        console.warn(`ModuleBadge: Invalid type "${type}", using fallback colors`);
        return (
            <Badge
            variant="outline"
            className={cn(
                'flex items-center gap-1',
                'text-gray-600 dark:text-gray-400',
                'bg-gray-100 dark:bg-gray-900/30',
                'border-gray-300 dark:border-gray-700',
                className
            )}
            >
            {showIcon && <Icon className="h-3 w-3" />}
            <span className="text-xs font-medium">{label || 'Unknown'}</span>
            </Badge>
        );
    }

    return (
        <Badge
        variant="outline"
        className={cn(
            'flex items-center gap-1',
            colors.text,
            colors.bg,
            colors.border,
            className
        )}
        >
        {showIcon && <Icon className="h-3 w-3" />}
        <span className="text-xs font-medium">{label}</span>
        </Badge>
    );
}

/**
 * Compact dot indicator for module type
 *
 * DEFENSIVE: Falls back to neutral colors if type is invalid
 */
export function ModuleDot({ type, className }: { type: ModuleType; className?: string }) {
    // CRITICAL FIX: Defensive check for invalid types
    const safeType: ModuleType = type && type in MODULE_COLORS ? type : 'flashcard';
    const colors = MODULE_COLORS[safeType];

    // Additional safety check
    if (!colors) {
        console.warn(`ModuleDot: Invalid type "${type}", using fallback colors`);
        return (
            <div
            className={cn('h-2 w-2 rounded-full bg-gray-100 dark:bg-gray-900/30', className)}
            title="Unknown"
            />
        );
    }

    return (
        <div
        className={cn('h-2 w-2 rounded-full', colors.bg, className)}
        title={MODULE_LABELS[safeType]}
        />
    );
}
