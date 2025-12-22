/**
 * QuickStats - 4 key metrics display
 */
import { CreditCard, Brain, Activity, Clock } from "lucide-react";
import type { DashboardOverview } from "@/api/generated";

interface QuickStatsProps {
  overview: DashboardOverview | null;
}

export function QuickStats({ overview }: QuickStatsProps) {
  const stats = [
    {
      label: "Total Cards",
      value: overview?.total_cards || 0,
      icon: CreditCard,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
    },
    {
      label: "Mastery",
      value: `${((overview?.mastery_score || 0) * 100).toFixed(0)}%`,
      icon: Brain,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      label: "Reviews",
      value: overview?.cards_reviewed_today || 0,
      icon: Activity,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Time",
      value: `${Math.round(overview?.minutes_studied_today || 0)}m`,
      icon: Clock,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="synapse-panel p-4 flex items-center gap-4 hover:border-white/20 transition-all cursor-default"
        >
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}
          >
            <stat.icon className={`w-6 h-6 ${stat.color}`} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {stat.label}
            </p>
            <p className="text-2xl font-bold text-slate-200">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
