/**
 * MasteryOverview - Progress per topic/deck
 * Shows mastery levels across all learning content
 */

import { Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import GlassCard from "../shared/GlassCard";
import type { DashboardData } from "../../types/dashboard.types";

interface MasteryOverviewProps {
  data: DashboardData | undefined;
}

export function MasteryOverview({ data }: MasteryOverviewProps) {
  if (!data || !data.dueCards || data.dueCards.length === 0) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Mastery Overview</h3>
        </div>
        <div className="text-center py-12 text-slate-500">
          No mastery data available yet
        </div>
      </GlassCard>
    );
  }

  // Calculate mastery by deck
  const deckMastery = calculateDeckMastery(data);

  return (
    <GlassCard className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">
              Mastery Overview
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            {deckMastery.length} deck{deckMastery.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Deck List */}
        <div className="space-y-3">
          {deckMastery.map((deck, index) => (
            <div
              key={index}
              className="p-4 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-white truncate flex-1">
                  {deck.name}
                </h4>
                <Badge
                  variant="outline"
                  className={cn(
                    "ml-2",
                    getMasteryBadgeColor(deck.masteryScore),
                  )}
                >
                  {getMasteryLevel(deck.masteryScore)}
                </Badge>
              </div>

              <Progress
                value={deck.masteryScore * 100}
                className="h-2 bg-white/10"
                indicatorClassName={getMasteryProgressColor(deck.masteryScore)}
              />

              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="text-slate-400">
                  {deck.cardCount} cards •{" "}
                  {(deck.averageAccuracy * 100).toFixed(0)}% accuracy
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    getMasteryTextColor(deck.masteryScore),
                  )}
                >
                  {(deck.masteryScore * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

// Helper functions
function calculateDeckMastery(data: DashboardData) {
  const deckMap = new Map<
    string,
    {
      name: string;
      cards: any[];
    }
  >();

  // Group cards by deck
  data.dueCards.forEach((card) => {
    const deckName = card.deck_name || "Unknown Deck";
    if (!deckMap.has(deckName)) {
      deckMap.set(deckName, { name: deckName, cards: [] });
    }
    deckMap.get(deckName)!.cards.push(card);
  });

  // Calculate mastery for each deck
  return Array.from(deckMap.values())
    .map((deck) => {
      const masteredCount = deck.cards.filter(
        (c) => c.learning_state === "mastered",
      ).length;
      const totalCards = deck.cards.length;
      const masteryScore = totalCards > 0 ? masteredCount / totalCards : 0;

      const averageAccuracy =
        deck.cards.reduce((sum, c) => {
          return sum + (c.accuracy || 0);
        }, 0) / totalCards;

      return {
        name: deck.name,
        cardCount: totalCards,
        masteryScore,
        averageAccuracy: averageAccuracy / 100, // Convert from percentage to decimal
      };
    })
    .sort((a, b) => b.masteryScore - a.masteryScore);
}

function getMasteryLevel(score: number): string {
  if (score >= 0.9) return "Master";
  if (score >= 0.7) return "Advanced";
  if (score >= 0.5) return "Intermediate";
  if (score >= 0.3) return "Learning";
  return "Beginner";
}

function getMasteryBadgeColor(score: number): string {
  if (score >= 0.9)
    return "bg-purple-500/20 text-purple-400 border-purple-500/30";
  if (score >= 0.7) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (score >= 0.5) return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
  if (score >= 0.3)
    return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "bg-slate-500/20 text-slate-400 border-slate-500/30";
}

function getMasteryProgressColor(score: number): string {
  if (score >= 0.9) return "bg-purple-500";
  if (score >= 0.7) return "bg-blue-500";
  if (score >= 0.5) return "bg-cyan-500";
  if (score >= 0.3) return "bg-yellow-500";
  return "bg-slate-500";
}

function getMasteryTextColor(score: number): string {
  if (score >= 0.9) return "text-purple-400";
  if (score >= 0.7) return "text-blue-400";
  if (score >= 0.5) return "text-cyan-400";
  if (score >= 0.3) return "text-yellow-400";
  return "text-slate-400";
}
