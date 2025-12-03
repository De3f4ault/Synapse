/**
 * ItemCard - Display component for study items
 *
 * Shows flashcards, quizzes, and other study items with metadata
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import type { StudyItem } from '../../types/study.types';

interface ItemCardProps {
    item: StudyItem;
    onClick?: () => void;
    selected?: boolean;
}

export function ItemCard({ item, onClick, selected }: ItemCardProps) {
    const isOverdue = item.priority === 'high';
    const isNew = item.priority === 'new';

    return (
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Card
        className={`cursor-pointer transition-colors ${
            selected
            ? 'border-primary bg-primary/5'
            : 'hover:border-primary/50'
        }`}
        onClick={onClick}
        >
        <CardContent className="pt-6">
        <div className="space-y-3">
        {/* Header with type and priority */}
        <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
        <Badge variant={item.type === 'flashcard' ? 'default' : 'secondary'}>
        {item.type}
        </Badge>
        {isOverdue && (
            <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Overdue
            </Badge>
        )}
        {isNew && (
            <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3" />
            New
            </Badge>
        )}
        </div>
        <h4 className="font-medium line-clamp-2">{item.title}</h4>
        </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {item.estimatedTime && (
            <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {item.estimatedTime}m
            </div>
        )}
        {typeof item.masteryLevel === 'number' && (
            <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {item.masteryLevel}% mastery
            </div>
        )}
        {item.difficulty && (
            <div>
            Difficulty: {getDifficultyLabel(item.difficulty)}
            </div>
        )}
        </div>

        {/* Mastery Progress Bar */}
        {typeof item.masteryLevel === 'number' && (
            <div className="space-y-1">
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
            className={`h-full transition-all ${getMasteryColor(item.masteryLevel)}`}
            style={{ width: `${item.masteryLevel}%` }}
            />
            </div>
            </div>
        )}

        {/* Due date info */}
        {item.dueDate && (
            <p className="text-xs text-muted-foreground">
            {isOverdue ? 'Was due' : 'Due'} {formatDueDate(item.dueDate)}
            </p>
        )}
        </div>
        </CardContent>
        </Card>
        </motion.div>
    );
}

/**
 * Get difficulty label from numeric value (1-5)
 */
function getDifficultyLabel(difficulty: number): string {
    const labels: Record<number, string> = {
        1: 'Very Easy',
        2: 'Easy',
        3: 'Medium',
        4: 'Hard',
        5: 'Very Hard',
    };
    return labels[difficulty] || 'Medium';
}

/**
 * Get color class based on mastery level
 */
function getMasteryColor(mastery: number): string {
    if (mastery >= 80) return 'bg-green-500';
    if (mastery >= 60) return 'bg-blue-500';
    if (mastery >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
}

/**
 * Format due date relative to now
 */
function formatDueDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        const absDays = Math.abs(diffDays);
        if (absDays === 0) return 'today';
        if (absDays === 1) return 'yesterday';
        return `${absDays} days ago`;
    }

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'tomorrow';
    if (diffDays < 7) return `in ${diffDays} days`;
    if (diffDays < 30) return `in ${Math.floor(diffDays / 7)} weeks`;
    return date.toLocaleDateString();
}
