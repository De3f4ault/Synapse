/**
 * GraphAnalyticsPanel — Knowledge graph metrics sidebar.
 *
 * Displays:
 * - Graph stats (nodes, edges, density, avg connections)
 * - Top hubs (most connected entities)
 * - Link type distribution (colored bars)
 * - Growth trend (sparkline)
 * - Orphan count
 */

import { useGraphAnalytics } from "@/api/hooks/useGraph";
import { GlassCard } from "@/shared/ui";
import {
  Activity,
  GitBranch,
  Network,
  TrendingUp,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Sub-components
// ============================================================================

function StatCard({
  label,
  value,
  icon: Icon,
  color = "text-cyan-400",
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
      <div className={cn("p-2 rounded-lg bg-white/5", color)}>
        <Icon size={14} />
      </div>
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

function DistributionBar({
  label,
  percentage,
  count,
  color,
}: {
  label: string;
  percentage: number;
  count: number;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 capitalize">{label}</span>
        <span className="text-xs font-bold text-white">{count}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${Math.max(percentage, 2)}%` }}
        />
      </div>
    </div>
  );
}

function GrowthSparkline({ data }: { data: { date: string; links_created: number }[] }) {
  if (!data.length) return null;

  const max = Math.max(...data.map((d) => d.links_created), 1);
  const height = 40;
  const width = 200;
  const step = width / Math.max(data.length - 1, 1);

  const points = data
    .map((d, i) => `${i * step},${height - (d.links_created / max) * height}`)
    .join(" ");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">Last 30 days</span>
        <span className="text-xs font-bold text-emerald-400">
          +{data.reduce((sum, d) => sum + d.links_created, 0)} links
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-10"
        preserveAspectRatio="none"
      >
        <polyline
          points={points}
          fill="none"
          stroke="url(#sparkGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="sparkGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// ============================================================================
// Type distribution colors
// ============================================================================

const TYPE_COLORS: Record<string, string> = {
  manual: "bg-cyan-500",
  semantic: "bg-purple-500",
  derived: "bg-amber-500",
  ai_generated: "bg-emerald-500",
  user_defined: "bg-blue-500",
};

// ============================================================================
// Main Component
// ============================================================================

export function GraphAnalyticsPanel() {
  const { data, isLoading, error } = useGraphAnalytics(30, 10);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Activity size={12} />
          Graph Analytics
        </h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="text-slate-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Activity size={12} />
          Graph Analytics
        </h3>
        <p className="text-xs text-slate-600">
          Unable to load graph analytics.
        </p>
      </div>
    );
  }

  const { stats, hubs, orphans, clusters, link_type_distribution, growth_trend } = data;
  const totalOrphans = orphans?.reduce((sum, o) => sum + o.count, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
        <Activity size={12} className="text-cyan-400" />
        Graph Analytics
      </h3>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          label="Nodes"
          value={stats.total_nodes}
          icon={Network}
          color="text-cyan-400"
        />
        <StatCard
          label="Edges"
          value={stats.total_edges}
          icon={GitBranch}
          color="text-purple-400"
        />
        <StatCard
          label="Density"
          value={`${(stats.density * 100).toFixed(1)}%`}
          icon={TrendingUp}
          color="text-emerald-400"
        />
        <StatCard
          label="Avg Links"
          value={stats.avg_connections.toFixed(1)}
          icon={Activity}
          color="text-amber-400"
        />
      </div>

      {/* Clusters & Orphans */}
      {clusters && (
        <GlassCard className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              Clusters
            </span>
            <span className="text-xs font-bold text-white">
              {clusters.total_clusters}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              Largest
            </span>
            <span className="text-xs font-bold text-cyan-400">
              {clusters.largest_cluster_size} nodes
            </span>
          </div>
          {totalOrphans > 0 && (
            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle size={10} className="text-amber-400" />
                Orphan Nodes
              </span>
              <span className="text-xs font-bold text-amber-400">
                {totalOrphans}
              </span>
            </div>
          )}
        </GlassCard>
      )}

      {/* Top Hubs */}
      {hubs && hubs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
            Top Hubs
          </h4>
          <div className="space-y-1.5">
            {hubs.slice(0, 5).map((hub, i) => (
              <div
                key={`${hub.entity_type}-${hub.entity_id}`}
                className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
              >
                <span className="text-[10px] font-bold text-slate-600 w-4">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">
                    {hub.entity_label}
                  </p>
                  <p className="text-[10px] text-slate-600 capitalize">
                    {hub.entity_type}
                  </p>
                </div>
                <span className="text-xs font-bold text-cyan-400">
                  {hub.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Link Type Distribution */}
      {link_type_distribution && link_type_distribution.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
            Link Types
          </h4>
          <div className="space-y-2">
            {link_type_distribution.map((item) => (
              <DistributionBar
                key={item.link_type}
                label={item.link_type.replace(/_/g, " ")}
                percentage={item.percentage}
                count={item.count}
                color={TYPE_COLORS[item.link_type] ?? "bg-slate-500"}
              />
            ))}
          </div>
        </div>
      )}

      {/* Growth Trend */}
      {growth_trend && growth_trend.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
            Growth
          </h4>
          <GlassCard className="p-3">
            <GrowthSparkline data={growth_trend} />
          </GlassCard>
        </div>
      )}
    </div>
  );
}

export default GraphAnalyticsPanel;
