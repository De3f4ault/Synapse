/**
 * LearningPath - Visual progress tree for a learning path
 * Displays structured learning progression with mastery levels
 */

import { motion } from "framer-motion";
import { ProgressBar } from "./ProgressBar";
import { PathwayCard } from "./PathwayCard";
import GlassCard from "../shared/GlassCard";
import type { DashboardData } from "../../types/dashboard.types";

interface LearningPathProps {
  data: DashboardData | undefined;
}

export function LearningPath({ data }: LearningPathProps) {
  if (!data) return null;

  // Build pathways from deck data
  const pathways = buildPathwaysFromDecks(data);

  if (pathways.length === 0) {
    return (
      <GlassCard className="p-6">
        <div className="text-center py-12">
          <Circle className="w-16 h-16 mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">No learning paths yet</p>
          <p className="text-sm text-slate-500 mt-2">
            Create decks to build your learning path
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {pathways.map((pathway, index) => (
        <motion.div
          key={pathway.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <GlassCard className="p-6" hover>
            <div className="space-y-4">
              {/* Pathway Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{pathway.icon}</div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {pathway.title}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {
                        pathway.topics.filter((t) => t.status === "mastered")
                          .length
                      }{" "}
                      / {pathway.topics.length} topics mastered
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">
                    {pathway.completionPercentage}%
                  </p>
                  <p className="text-xs text-slate-500 uppercase">Complete</p>
                </div>
              </div>

              {/* Progress Bar */}
              <ProgressBar progress={pathway.completionPercentage} />

              {/* Topics */}
              <div className="space-y-2">
                {pathway.topics.map((topic, topicIndex) => (
                  <PathwayCard
                    key={topic.id}
                    topic={topic}
                    index={topicIndex}
                  />
                ))}
              </div>
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
}

// Helper function to build pathways from deck data
function buildPathwaysFromDecks(data: DashboardData) {
  // Group decks by category (first tag or "General")
  const decksByCategory: Record<string, any[]> = {};

  data.dueCards.forEach((card) => {
    const category = card.deck_name || "General";
    if (!decksByCategory[category]) {
      decksByCategory[category] = [];
    }
    decksByCategory[category].push(card);
  });

  // Build pathways
  return Object.entries(decksByCategory).map(([category, cards]) => {
    const totalCards = cards.length;
    const masteredCards = cards.filter(
      (c) => c.learning_state === "mastered",
    ).length;
    const completionPercentage =
      totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

    return {
      id: category.toLowerCase().replace(/\s+/g, "-"),
      title: category,
      icon: getCategoryIcon(category),
      completionPercentage,
      topics: [
        {
          id: `${category}-main`,
          title: category,
          status: getTopicStatus(cards),
          completionPercentage,
          accuracy: calculateAverageAccuracy(cards),
          reviewCount: cards.reduce(
            (sum, c) => sum + (c.times_reviewed || 0),
            0,
          ),
          prerequisites: [],
          deckId: cards[0]?.deck_id,
        },
      ],
    };
  });
}

function getTopicStatus(cards: any[]) {
  const masteredCount = cards.filter(
    (c) => c.learning_state === "mastered",
  ).length;
  const totalCount = cards.length;

  if (masteredCount === totalCount) return "mastered";
  if (masteredCount > 0) return "in-progress";
  if (cards.some((c) => c.times_reviewed > 0)) return "in-progress";
  return "available";
}

function calculateAverageAccuracy(cards: any[]) {
  const accuracies = cards
    .filter((c) => c.accuracy != null)
    .map((c) => c.accuracy);
  if (accuracies.length === 0) return 0;
  return accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
}

function getCategoryIcon(category: string) {
  const icons: Record<string, string> = {
    biology: "",
    chemistry: "",
    physics: "",
    math: "",
    history: "",
    language: "",
    general: "",
  };

  const key = category.toLowerCase();
  return icons[key] || icons.general;
}
