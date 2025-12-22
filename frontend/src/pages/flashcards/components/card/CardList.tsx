/**
 * CardList Component
 * Display flashcards in a table format with actions
 */

import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NeumorphicBadge } from "@/components/neumorphic";
import type { Flashcard, LearningState } from "../../types/flashcards.types";

interface CardListProps {
  cards: Flashcard[];
  onEdit: (cardId: number) => void;
  onDelete: (cardId: number) => void;
}

function getBadgeColor(
  state: LearningState,
): "purple" | "cyan" | "coral" | "emerald" | "slate" {
  switch (state) {
    case "new":
      return "purple";
    case "learning":
      return "amber";
    case "review":
      return "coral";
    case "mastered":
      return "cyan";
    default:
      return "slate";
  }
}

export function CardList({ cards, onEdit, onDelete }: CardListProps) {
  return (
    <div className="nm-panel overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-white/5 hover:bg-transparent">
            <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider pl-6">
              Query
            </TableHead>
            <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">
              Response
            </TableHead>
            <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">
              State
            </TableHead>
            <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">
              Accuracy
            </TableHead>
            <TableHead className="text-right text-slate-500 font-bold text-xs uppercase tracking-wider pr-6">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cards.map((card, index) => (
            <TableRow
              key={card.id}
              className={`border-white/5 transition-colors ${index % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent"} hover:bg-white/5`}
            >
              <TableCell className="max-w-xs truncate text-slate-300 font-medium pl-6 py-4">
                {card.front_text}
              </TableCell>
              <TableCell className="max-w-xs truncate text-slate-400 py-4">
                {card.back_text}
              </TableCell>
              <TableCell className="py-4">
                <NeumorphicBadge
                  color={getBadgeColor(card.learning_state)}
                  variant="outline"
                >
                  {card.learning_state}
                </NeumorphicBadge>
              </TableCell>
              <TableCell className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                      style={{ width: `${(card.accuracy || 0) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {((card.accuracy || 0) * 100).toFixed(0)}%
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right pr-6 py-4">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(card.id)}
                    className="h-8 w-8 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(card.id)}
                    className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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
