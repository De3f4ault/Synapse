/**
 * DeckStats Component
 * Display deck statistics in a modern dashboard grid
 */

import { motion } from "framer-motion";
import { Layers, Clock, Brain, Sparkles } from "lucide-react";
import type { DeckStats as DeckStatsType } from "../../types/flashcards.types";
import { NeumorphicStats, NeumorphicCard } from "@/components/neumorphic";

interface DeckStatsProps {
  stats: DeckStatsType;
}

export function DeckStats({ stats }: DeckStatsProps) {
  const statItems = [
    {
      label: "Total Fragments",
      value: stats.totalCards,
      icon: <Layers size={16} />,
      trend: "All cards",
      trendUp: true,
    },
    {
      label: "Due Now",
      value: stats.dueCards,
      icon: <Clock size={16} />,
      trend: "Needs review",
      trendUp: false,
    },
    {
      label: "In Progress",
      value: stats.learningCards,
      icon: <Brain size={16} />,
      trend: "Active learning",
      trendUp: true,
    },
    {
      label: "Mastered",
      value: stats.masteredCards,
      icon: <Sparkles size={16} />,
      trend: "Memory consolidated",
      trendUp: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {/* Circular Progress */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="lg:col-span-1"
      >
        <NeumorphicCard className="flex flex-col items-center justify-center p-6 h-full min-h-[180px]">
          <div className="relative w-32 h-32">
            <svg className="transform -rotate-90 w-32 h-32">
              {/* Track */}
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-slate-800/50"
              />
              {/* Inner Shadow for Track */}
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="black"
                strokeWidth="1"
                fill="none"
                className="opacity-20"
              />

              {/* Active Segment */}
              <motion.circle
                cx="64"
                cy="64"
                r="56"
                stroke="url(#progressGradient)"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 56}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
                animate={{
                  strokeDashoffset:
                    2 * Math.PI * 56 * (1 - stats.masteryPercent / 100),
                }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                strokeLinecap="round"
                className="drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]"
              />

              {/* Gradient Def */}
              <defs>
                <linearGradient
                  id="progressGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-purple-400">
                {stats.masteryPercent}%
              </span>
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                Synced
              </span>
            </div>
          </div>
        </NeumorphicCard>
      </motion.div>

      {/* Quick Stats */}
      {statItems.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + index * 0.1 }}
        >
          <NeumorphicStats
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            trend={stat.trend}
            trendUp={stat.trendUp}
          />
        </motion.div>
      ))}
    </div>
  );
}
