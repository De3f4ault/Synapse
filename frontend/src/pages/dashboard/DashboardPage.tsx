import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Layers,
  Target,
  Activity,
  Clock,
  Zap,
} from "lucide-react";

// Core
import { DashboardProviders } from "./core";

// Metrics
import {
  StatusCard,
  useMetrics,
  TodaysProgressCard,
  ReviewForecastCard,
  LastSessionCard,
  useTodayStats,
  useForecast,
  useLastSession,
} from "./metrics";

// Charts
import {
  ActivityGraph,
  MasteryChart,
  useChartsData,
  type TimeBucket,
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
import { NeumorphicCard } from "@/components/neumorphic";

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
  const [bucket, setBucket] = useState<TimeBucket>("day");
  const { data: chartsData, isLoading: isChartsLoading, isFetching } = useChartsData(bucket);
  const { isLoading: isActivityLoading } = useActivityData();
  const { weakAreas, isLoading: isInsightsLoading } = useInsights();
  const { data: recentContent, isLoading: isRecentLoading } = useRecentContent();
  
  // New awareness cards data
  const { data: todayStats, isLoading: isTodayLoading } = useTodayStats();
  const { data: forecast, isLoading: isForecastLoading } = useForecast();
  const { data: lastSession, isLoading: isLastSessionLoading } = useLastSession();

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
      <div className="relative min-h-screen bg-background text-foreground flex items-center justify-center">
        <NeumorphicCard className="p-8 text-center max-w-md flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-muted border border-border rounded-lg flex items-center justify-center mb-4 text-destructive">
            <Zap className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">System Offline</h2>
          <p className="text-muted-foreground">
            Unable to establish connection to command center.
          </p>
        </NeumorphicCard>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden flex flex-col">
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-8 pb-32 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground  ">
              Command Center
            </h1>
            <p className="text-muted-foreground font-mono text-sm tracking-wider uppercase">
              {today}
            </p>
          </div>
          {/* Integrated Quick Actions - Smaller, more subtle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/flashcards/review")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary/20 to-accent/10 border border-primary/30 text-primary hover:from-primary/30 hover:to-accent/20 transition-all group"
            >
              <Zap className="h-4 w-4 group-hover:text-primary" />
              <span className="text-sm font-medium">Review</span>
            </button>
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
                  className="h-32 rounded-xl bg-foreground/5 border border-border animate-pulse"
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
                value={
                  (metrics?.totalStudyTimeMinutes || 0) >= 60
                    ? `${((metrics?.totalStudyTimeMinutes || 0) / 60).toFixed(1)}h`
                    : `${metrics?.totalStudyTimeMinutes || 0}m`
                }
                subtitle="Focused learning"
                icon={Clock}
                color="amber"
              />
            </>
          )}
        </div>

        {/* MAIN BENTO GRID */}
        <div className="grid gap-6 md:grid-cols-4 lg:grid-cols-4">
          {/* Row 1: Activity Graph (2 cols) + Stacked Cards (1 col) + Topic Mastery (1 col) */}
          <div className="col-span-4 lg:col-span-2">
            <ActivityGraph
              data={chartsData.performance}
              isLoading={isChartsLoading}
              isFetching={isFetching}
              bucket={bucket}
              onBucketChange={setBucket}
            />
          </div>

          {/* Stacked Flashcard + Quiz Cards (1 col) */}
          {!isLoading && (
            <div className="col-span-2 lg:col-span-1 flex flex-col gap-4">
              {/* Compact Flashcard Card */}
              <div className="flex-1 rounded-xl bg-gradient-to-br from-primary/10 to-info/5 border border-primary/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Flashcards</h3>
                    <p className="text-[10px] text-muted-foreground">{metrics?.totalCards || 0} cards</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">Due Now</span>
                    <span className="text-base font-bold text-primary">{metrics?.dueCards || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">Accuracy</span>
                    <span className="text-sm font-medium text-primary/80">{(metrics?.flashcardAccuracy || 0).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              {/* Compact Quiz Card */}
              <div className="flex-1 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
                    <Target className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Quizzes</h3>
                    <p className="text-[10px] text-muted-foreground">{metrics?.totalQuizzes || 0} quizzes</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">Attempts</span>
                    <span className="text-base font-bold text-accent">{metrics?.totalQuizAttempts || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">Accuracy</span>
                    <span className="text-sm font-medium text-accent/80">{(metrics?.quizAccuracy || 0).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Topic Mastery (1 col) */}
          <div className="col-span-2 lg:col-span-1">
            <MasteryChart data={chartsData.topicMastery} />
          </div>

          {/* Row 2: Progress + Forecast */}
          <div className="col-span-4 lg:col-span-1">
            <TodaysProgressCard
              reviewsCompleted={todayStats?.reviews_completed || 0}
              totalDue={forecast?.due_today || 0}
              studyTimeMinutes={todayStats?.study_time_minutes || 0}
              isLoading={isTodayLoading || isForecastLoading}
            />
          </div>
          <div className="col-span-4 lg:col-span-1">
            <ReviewForecastCard
              tomorrow={forecast?.due_tomorrow || 0}
              thisWeek={forecast?.due_this_week || 0}
              overdue={forecast?.overdue || 0}
              isLoading={isForecastLoading}
            />
          </div>
          <div className="col-span-4 lg:col-span-2">
            <LastSessionCard
              cardsReviewed={lastSession?.cards_reviewed || 0}
              durationMinutes={lastSession?.duration_minutes || 0}
              accuracyPercent={lastSession?.accuracy_percent || 0}
              qualityLabel={lastSession?.quality_label || "No sessions yet"}
              hasSession={lastSession?.has_session || false}
              isLoading={isLastSessionLoading}
            />
          </div>
          
          {/* Row 3: Weak Areas + Recent Files */}
          <div className="col-span-4 lg:col-span-2">
            <WeakAreasList data={weakAreas} />
          </div>
          <div className="col-span-4 lg:col-span-2">
            <RecentContent
              documents={recentContent.documents}
              notes={recentContent.notes}
            />
          </div>
          
          {/* Transparency Footer */}
          <div className="col-span-4 text-center py-2">
            <span className="text-xs text-muted-foreground">
              Based on {todayStats?.learning_events || 0} learning events
            </span>
          </div>
        </div>
      </div>

      {/* Dashboard Assistant - Always monitoring */}
      <DashboardAssistant />
    </div>
  );
}

export default DashboardPage;
