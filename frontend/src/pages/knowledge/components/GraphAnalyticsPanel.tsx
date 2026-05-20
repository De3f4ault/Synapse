/**
 * GraphAnalyticsPanel — Knowledge graph metrics sidebar.
 *
 * Displays:
 * - Graph stats (nodes, edges, density, avg connections)
 * - Top hubs (most connected entities)
 * - Link type distribution (colored bars)
 * - Growth trend (sparkline)
 * - Orphan count
 *
 * Field names aligned to backend analytics.py responses.
 */

import { useGraphAnalytics } from "@/api/hooks/useGraph";
import type { OrphanMap } from "@/api/hooks/useGraph";
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
  color = "text-primary",
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
      <div className={cn("p-2 rounded-lg bg-foreground/5", color)}>
        <Icon size={14} />
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm font-bold text-foreground">{value}</p>
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
        <span className="text-xs text-muted-foreground capitalize">{label}</span>
        <span className="text-xs font-bold text-foreground">{count}</span>
      </div>
      <div className="h-1.5 bg-foreground/5 rounded-full overflow-hidden">
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
        <span className="text-xs text-muted-foreground">Last 30 days</span>
        <span className="text-xs font-bold text-accent-olive">
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
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

/** Count total orphan nodes from the backend Dict shape */
function countOrphans(orphans: OrphanMap | undefined | null): number {
  if (!orphans || typeof orphans !== "object") return 0;
  return Object.values(orphans).reduce(
    (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
    0,
  );
}

// ============================================================================
// Type distribution colors
// ============================================================================

const TYPE_COLORS: Record<string, string> = {
  manual: "bg-primary",
  semantic: "bg-accent",
  derived: "bg-warning",
  ai_generated: "bg-accent-olive",
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
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <Activity size={12} />
          Graph Analytics
        </h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="text-muted-foreground animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 space-y-4">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <Activity size={12} />
          Graph Analytics
        </h3>
        <p className="text-xs text-muted-foreground">
          Unable to load graph analytics.
        </p>
      </div>
    );
  }

  const { stats, hubs, orphans, clusters, link_type_distribution, growth_trend } = data;
  const totalOrphans = countOrphans(orphans);

  // Defensive defaults for stats fields
  const totalNodes = stats?.total_nodes ?? 0;
  const totalEdges = stats?.total_edges ?? 0;
  const density = stats?.density ?? 0;
  const avgConnections = stats?.avg_connections_per_node ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
        <Activity size={12} className="text-primary" />
        Graph Analytics
      </h3>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          label="Nodes"
          value={totalNodes}
          icon={Network}
          color="text-primary"
        />
        <StatCard
          label="Edges"
          value={totalEdges}
          icon={GitBranch}
          color="text-accent"
        />
        <StatCard
          label="Density"
          value={`${(density * 100).toFixed(1)}%`}
          icon={TrendingUp}
          color="text-accent-olive"
        />
        <StatCard
          label="Avg Links"
          value={avgConnections.toFixed(1)}
          icon={Activity}
          color="text-warning"
        />
      </div>

      {/* Clusters & Orphans */}
      {clusters && (
        <div className="p-3 space-y-2 rounded-xl bg-muted/30 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Clusters
            </span>
            <span className="text-xs font-bold text-foreground">
              {clusters.cluster_count ?? 0}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Largest
            </span>
            <span className="text-xs font-bold text-primary">
              {clusters.largest_cluster_size ?? 0} nodes
            </span>
          </div>
          {totalOrphans > 0 && (
            <div className="flex items-center justify-between pt-1 border-t border-border">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle size={10} className="text-warning" />
                Orphan Nodes
              </span>
              <span className="text-xs font-bold text-warning">
                {totalOrphans}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Top Hubs — backend returns { label, connections } */}
      {hubs && hubs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
            Top Hubs
          </h4>
          <div className="space-y-1.5">
            {hubs.slice(0, 5).map((hub, i) => (
              <div
                key={`${hub.entity_type}-${hub.entity_id}`}
                className="flex items-center gap-2 p-2 rounded-lg bg-foreground/5 hover:bg-muted/50 transition-colors"
              >
                <span className="text-[10px] font-bold text-muted-foreground w-4">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate">
                    {hub.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {hub.entity_type}
                  </p>
                </div>
                <span className="text-xs font-bold text-primary">
                  {hub.connections}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Link Type Distribution */}
      {link_type_distribution && link_type_distribution.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
            Link Types
          </h4>
          <div className="space-y-2">
            {link_type_distribution.map((item) => (
              <DistributionBar
                key={item.link_type}
                label={item.link_type.replace(/_/g, " ")}
                percentage={item.percentage}
                count={item.count}
                color={TYPE_COLORS[item.link_type] ?? "bg-muted-foreground"}
              />
            ))}
          </div>
        </div>
      )}

      {/* Growth Trend */}
      {growth_trend && growth_trend.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
            Growth
          </h4>
          <div className="p-3 rounded-xl bg-muted/30 border border-border">
            <GrowthSparkline data={growth_trend} />
          </div>
        </div>
      )}
    </div>
  );
}

export default GraphAnalyticsPanel;
