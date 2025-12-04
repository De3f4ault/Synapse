/**
 * CardList Component
 * Display flashcards in a table format with actions
 */

import { Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Flashcard, LearningState } from '../../types/flashcards.types';

interface CardListProps {
    cards: Flashcard[];
    onEdit: (cardId: number) => void;
    onDelete: (cardId: number) => void;
}

function getLearningStateColor(state: LearningState): string {
    switch (state) {
        case 'new':
            return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
        case 'learning':
            return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
        case 'review':
            return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
        case 'mastered':
            return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
        default:
            return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
}

export function CardList({ cards, onEdit, onDelete }: CardListProps) {
    return (
        <div className="border border-white/5 rounded-lg overflow-hidden">
        <Table>
        <TableHeader>
        <TableRow className="border-white/5 hover:bg-white/5">
        <TableHead className="text-slate-400 font-mono text-xs uppercase">
        Query
        </TableHead>
        <TableHead className="text-slate-400 font-mono text-xs uppercase">
        Response
        </TableHead>
        <TableHead className="text-slate-400 font-mono text-xs uppercase">
        State
        </TableHead>
        <TableHead className="text-slate-400 font-mono text-xs uppercase">
        Accuracy
        </TableHead>
        <TableHead className="text-right text-slate-400 font-mono text-xs uppercase">
        Actions
        </TableHead>
        </TableRow>
        </TableHeader>
        <TableBody>
        {cards.map((card) => (
            <TableRow key={card.id} className="border-white/5 hover:bg-white/5">
            <TableCell className="max-w-xs truncate text-slate-300">
            {card.front_text}
            </TableCell>
            <TableCell className="max-w-xs truncate text-slate-300">
            {card.back_text}
            </TableCell>
            <TableCell>
            <Badge
            variant="outline"
            className={cn(
                'font-mono text-[10px] uppercase tracking-wider',
                getLearningStateColor(card.learning_state)
            )}
            >
            {card.learning_state}
            </Badge>
            </TableCell>
            <TableCell>
            <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500"
            style={{ width: `${card.accuracy * 100}%` }}
            />
            </div>
            <span className="text-xs font-mono text-slate-400">
            {(card.accuracy * 100).toFixed(0)}%
            </span>
            </div>
            </TableCell>
            <TableCell className="text-right">
            <div className="flex justify-end gap-1">
            <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(card.id)}
            className="hover:bg-cyan-500/20 text-cyan-400"
            >
            <Edit className="h-4 w-4" />
            </Button>
            <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(card.id)}
            className="hover:bg-red-500/20 text-red-400"
            >
            <Trash2 className="h-4 w-4" />
            </Button>
            </div>
            </TableCell>
            </TableRow>
        ))}
        </TableBody>
        </Table>
        </div>
    );
}
