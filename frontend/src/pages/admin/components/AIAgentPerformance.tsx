import { useEffect, useState } from "react";
import { adminApi, type AgentPerformanceResponse } from "@/api/admin";
import { PanelTitle, FreshnessTag, LoadingSkeleton, ErrorState } from "./AdminPanelWrapper";

const AGENT_COLORS: Record<string, string> = {
  react: "#a78bfa",
  rag: "#60a5fa",
  summarizer: "#34d399",
  flashcard: "#f59e0b",
  quiz: "#fb923c",
  default: "#7d8590",
};

export function AIAgentPerformance() {
  const [data, setData] = useState<AgentPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true); setError("");
    adminApi.getAgentPerformance(30).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // Aggregate by agent_type across all days
  const byType = data?.rows.reduce<Record<string, {
    runs: number; failed: number; cost: number; avgIter: number[]; avgSecs: number[];
  }>>((acc, row) => {
    const k = row.agent_type;
    if (!acc[k]) acc[k] = { runs: 0, failed: 0, cost: 0, avgIter: [], avgSecs: [] };
    acc[k].runs += row.total_runs;
    acc[k].failed += row.failed_runs;
    acc[k].cost += row.total_cost_usd ?? 0;
    if (row.avg_react_iterations != null) acc[k].avgIter.push(row.avg_react_iterations);
    if (row.avg_execution_seconds != null) acc[k].avgSecs.push(row.avg_execution_seconds);
    return acc;
  }, {});

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <PanelTitle>Agent Performance — Last 30 Days</PanelTitle>
        {data && <FreshnessTag dataAsOf={data.data_as_of} />}
      </div>

      {loading && <LoadingSkeleton rows={4} />}
      {error && <ErrorState message={error} onRetry={load} />}

      {data && !loading && byType && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {Object.entries(byType).map(([type, stats]) => {
            const failRate = stats.runs > 0 ? (stats.failed / stats.runs) * 100 : 0;
            const color = AGENT_COLORS[type.toLowerCase()] ?? AGENT_COLORS.default;
            const avgIter = avg(stats.avgIter);
            const avgSecs = avg(stats.avgSecs);
            return (
              <div key={type} style={{
                display: "grid",
                gridTemplateColumns: "140px 1fr 80px 80px 80px 90px",
                alignItems: "center",
                gap: "12px",
                padding: "10px 12px",
                background: "#0d1117",
                borderRadius: "8px",
                borderLeft: `3px solid ${color}`,
              }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color, fontFamily: "monospace" }}>
                  {type}
                </span>
                {/* Mini bar — failure rate */}
                <div style={{ position: "relative" }}>
                  <div style={{ height: "4px", background: "#21262d", borderRadius: "2px" }}>
                    <div style={{
                      width: `${Math.min(failRate, 100)}%`,
                      height: "100%",
                      background: failRate > 10 ? "#ef4444" : failRate > 5 ? "#f59e0b" : "#10b981",
                      borderRadius: "2px",
                      transition: "width 0.6s ease",
                      minWidth: failRate > 0 ? "3px" : "0",
                    }} />
                  </div>
                  <span style={{ fontSize: "10px", color: "#484f58", display: "block", marginTop: "2px" }}>
                    {failRate.toFixed(1)}% fail
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#e6edf3", fontVariantNumeric: "tabular-nums" }}>
                    {stats.runs.toLocaleString()}
                  </div>
                  <div style={{ fontSize: "10px", color: "#484f58" }}>runs</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#e6edf3", fontVariantNumeric: "tabular-nums" }}>
                    {avgIter != null ? avgIter.toFixed(1) : "—"}
                  </div>
                  <div style={{ fontSize: "10px", color: "#484f58" }}>avg iters</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#e6edf3", fontVariantNumeric: "tabular-nums" }}>
                    {avgSecs != null ? `${avgSecs.toFixed(1)}s` : "—"}
                  </div>
                  <div style={{ fontSize: "10px", color: "#484f58" }}>avg time</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#e6edf3", fontVariantNumeric: "tabular-nums" }}>
                    ${stats.cost.toFixed(3)}
                  </div>
                  <div style={{ fontSize: "10px", color: "#484f58" }}>total cost</div>
                </div>
              </div>
            );
          })}
          {Object.keys(byType).length === 0 && (
            <p style={{ fontSize: "13px", color: "#484f58", textAlign: "center", padding: "24px 0" }}>
              No agent metrics in the last 30 days
            </p>
          )}
        </div>
      )}
    </>
  );
}
