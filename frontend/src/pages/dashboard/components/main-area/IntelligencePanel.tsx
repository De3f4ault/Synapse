/**
 * IntelligencePanel - AI insights and recommendations
 * Displays weak areas, next actions, milestones, and context insights
 */

import { Brain, TrendingUp } from "lucide-react";
import { useIntelligence } from "../../hooks/useIntelligence";
import { NextActionCard } from "../intelligence/NextActionCard";
import { WeakAreaCard } from "../intelligence/WeakAreaCard";
import { MilestoneCard } from "../intelligence/MilestoneCard";
import { ContextCard } from "../intelligence/ContextCard";
import GlassCard from "../shared/GlassCard";
import type { DashboardData } from "../../types/dashboard.types";

interface IntelligencePanelProps {
  data: DashboardData | undefined;
}

export function IntelligencePanel({ data }: IntelligencePanelProps) {
  const { weakAreas, nextAction, milestones, contextInsights, isLoading } =
    useIntelligence(data);

  if (isLoading) {
    return (
      <GlassCard className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded w-1/3" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-white/10 rounded" />
            ))}
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Intelligence</h3>
        </div>

        {/* Next Action */}
        {nextAction && (
          <div>
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Recommended Action
            </h4>
            <NextActionCard recommendation={nextAction} />
          </div>
        )}

        {/* Weak Areas */}
        {weakAreas.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Areas to Strengthen
            </h4>
            <div className="space-y-3">
              {weakAreas.slice(0, 3).map((area, index) => (
                <WeakAreaCard key={index} weakArea={area} />
              ))}
            </div>
          </div>
        )}

        {/* Milestones */}
        {milestones.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Recent Achievements
            </h4>
            <div className="space-y-3">
              {milestones.slice(0, 2).map((milestone, index) => (
                <MilestoneCard key={milestone.id} milestone={milestone} />
              ))}
            </div>
          </div>
        )}

        {/* Context Insights */}
        {contextInsights.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Insights
            </h4>
            <div className="space-y-2">
              {contextInsights.map((insight, index) => (
                <ContextCard key={index} insight={insight} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!nextAction &&
          weakAreas.length === 0 &&
          milestones.length === 0 &&
          contextInsights.length === 0 && (
            <div className="text-center py-12">
              <Brain className="w-16 h-16 mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400">No insights available yet</p>
              <p className="text-sm text-slate-500 mt-2">
                Start studying to generate insights
              </p>
            </div>
          )}
      </div>
    </GlassCard>
  );
}
