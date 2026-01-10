import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Layers,
  Target,
  Activity,
  Clock,
  Zap,
  MessageSquare,
} from "lucide-react";

// Core
import { DashboardProviders } from "./core";

// Metrics
import { StatusCard, useMetrics } from "./metrics";

// Charts
import {
  ActivityGraph,
  MasteryChart,
  useChartsData,
} from "./charts";

// Insights
import { WeakAreasList, useInsights } from "./insights";

// Activity
import {
  RecentContent,
  useActivityData,
  useRecentContent,
} from "./activity";

// Assistant
import { DashboardAssistant } from "./assistant";

// UI
import { NeumorphicButton, NeumorphicCard } from "@/components/neumorphic";

export const DashboardPage: React.FC = () => {
  return (
    <DashboardProviders>
      <DashboardContent />
    </DashboardProviders>
  );
};

function DashboardContent() {
  const navigate = useNavigate();

  // Data Hooks
  const { metrics, isLoading: isMetricsLoading, error: metricsError } = useMetrics();
  const { data: chartsData, isLoading: isChartsLoading } = useChartsData();
  const { isLoading: isActivityLoading } = useActivityData();
  const { weakAreas, isLoading: isInsightsLoading } = useInsights();
  const { data: recentContent, isLoading: isRecentLoading } = useRecentContent();

  const isLoading =
    isMetricsLoading ||
    isChartsLoading ||
    isActivityLoading ||
    isInsightsLoading ||
    isRecentLoading;

  // Date formatter
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (metricsError) {
    return (
      <div className="relative min-h-screen nm-bg nm-constellation-bg flex items-center justify-center">
        <NeumorphicCard className="p-8 text-center max-w-md flex flex-col items-center">
          <div className="w-16 h-16 rounded-full nm-inset flex items-center justify-center mb-4 text-red-400">
            <Zap className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">System Offline</h2>
          <p className="text-slate-400">
            Unable to establish connection to command center.
          </p>
        </NeumorphicCard>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen nm-bg nm-constellation-bg overflow-hidden flex flex-col">
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-8 pb-32 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white shadow-cyan-500/20 drop-shadow-sm">
              Command Center
            </h1>
            <p className="text-slate-400 font-mono text-sm tracking-wider uppercase">
              {today}
            </p>
          </div>
          <div className="flex gap-3">
            <NeumorphicButton
              variant="primary"
              onClick={() => navigate("/flashcards/review")}
              className="text-white"
            >
              <Zap className="mr-2 h-4 w-4" />
              Start Review
            </NeumorphicButton>
            <NeumorphicButton variant="ghost" onClick={() => navigate("/chat")}>
              <MessageSquare className="mr-2 h-4 w-4" />
              AI Chat
            </NeumorphicButton>
          </div>
        </div>

        {/* TOP STATS ROW */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array(4)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className="h-32 rounded-xl bg-white/5 border border-white/5 animate-pulse"
                />
              ))
          ) : (
            <>
              <StatusCard
                title="Due Cards"
                value={metrics?.dueCards || 0}
                subtitle="Ready for review"
                icon={Layers}
                trend={(metrics?.dueCards || 0) > 0 ? "up" : "neutral"}
                onClick={() => navigate("/flashcards")}
                color="cyan"
              />
              <StatusCard
                title="Accuracy"
                value={`${(metrics?.accuracy || 0).toFixed(1)}%`}
                subtitle="Last 30 days"
                icon={Target}
                trend={(metrics?.accuracy || 0) > 80 ? "up" : "neutral"}
                trendValue="+2.5%"
                color="purple"
              />
              <StatusCard
                title="Study Streak"
                value={`${metrics?.streakDays || 0} days`}
                subtitle="Keep it up!"
                icon={Activity}
                trend="up"
                color="emerald"
              />
              <StatusCard
                title="Total Time"
                value={`${Math.floor((metrics?.totalStudyTimeMinutes || 0) / 60)}h`}
                subtitle="Focused learning"
                icon={Clock}
                color="amber"
              />
            </>
          )}
        </div>

        {/* MAIN BENTO GRID */}
        <div className="grid gap-6 md:grid-cols-4 lg:grid-cols-4">
          {/* Row 1: Activity Graph + Mastery */}
          <div className="col-span-4 lg:col-span-3">
            <ActivityGraph
              data={chartsData.performance}
              isLoading={isChartsLoading}
            />
          </div>

          <div className="col-span-4 lg:col-span-1">
            <MasteryChart data={chartsData.topicMastery} />
          </div>

          {/* Row 2: Weak Areas + Recent Files */}
          <div className="col-span-4 lg:col-span-2">
            <WeakAreasList data={weakAreas} />
          </div>
          <div className="col-span-4 lg:col-span-2">
            <RecentContent
              documents={recentContent.documents}
              notes={recentContent.notes}
            />
          </div>
        </div>
      </div>

      {/* Dashboard Assistant - Always monitoring */}
      <DashboardAssistant />
    </div>
  );
}

export default DashboardPage;
