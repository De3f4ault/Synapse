import { Badge } from '@/components/ui/badge';
import { FileText, BookOpen, Zap, MessageSquare, ClipboardList, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ModuleBadge - Neon Style
 * FIXED: Changed to match ModuleType definition ('flashcards' not 'flashcard')
 */

type ModuleType = 'documents' | 'notes' | 'flashcards' | 'chat' | 'quizzes';

interface ModuleBadgeProps {
    type?: ModuleType;
    moduleType?: ModuleType; // Alternative prop name for compatibility
    className?: string;
    showIcon?: boolean;
    size?: 'sm' | 'default';
}

const MODULE_ICONS: Record<ModuleType, LucideIcon> = {
    documents: FileText,
    notes: BookOpen,
    flashcards: Zap,
    chat: MessageSquare,
    quizzes: ClipboardList,
};

export function ModuleBadge({ type, moduleType, className, showIcon = true, size = 'default' }: ModuleBadgeProps) {
    // Support both 'type' and 'moduleType' props
    const actualType = type || moduleType || 'flashcards';

    // Ensure we have a valid type
    const safeType = actualType in MODULE_ICONS ? actualType : 'flashcards';

    const Icon = MODULE_ICONS[safeType];
    const colors = getNeonColors(safeType);

    return (
        <Badge
        variant="outline"
        className={cn(
            'flex items-center gap-1 border font-mono font-bold tracking-tight uppercase',
            colors.bg,
            colors.text,
            colors.border,
            size === 'sm' ? 'text-[9px] px-1 h-4' : 'text-[10px] px-2 h-5',
            className
        )}
        >
        {showIcon && <Icon className={cn(size === 'sm' ? 'w-2 h-2' : 'w-3 h-3')} />}
        <span>{safeType}</span>
        </Badge>
    );
}

// Updated Neon Color Palette
function getNeonColors(type: ModuleType) {
    switch (type) {
        case 'flashcards':
            return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' };
        case 'documents':
            return { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' };
        case 'notes':
            return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
        case 'chat':
            return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' };
        case 'quizzes':
            return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' };
        default:
            return { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' };
    }
}

export function ModuleDot({ type, moduleType, className }: { type?: ModuleType; moduleType?: ModuleType; className?: string }) {
    const actualType = type || moduleType || 'flashcards';
    const safeType = actualType in MODULE_ICONS ? actualType : 'flashcards';
    const colors = getNeonColors(safeType);

    return (
        <div className={cn(
            'h-1.5 w-1.5 rounded-full shadow-[0_0_5px]',
            colors.bg.replace('/10', ''),
                           colors.text.replace('text-', 'bg-'),
                           className
        )} />
    );
}
