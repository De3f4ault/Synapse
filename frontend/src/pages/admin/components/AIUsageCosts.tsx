import { useEffect, useState } from "react";
import { adminApi, type AIUsageCostsResponse } from "@/api/admin";
import { PanelTitle, FreshnessTag, LoadingSkeleton, ErrorState } from "./AdminPanelWrapper";

export function AIUsageCosts() {
  const [data, setData] = useState<AIUsageCostsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true); setError("");
    adminApi.getAIUsageCosts(30).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const totals = data?.rows.reduce(
    (acc, r) => ({
      cost: acc.cost + (r.total_cost_usd ?? 0),
      tokens: acc.tokens + (r.total_tokens_burned ?? 0),
      calls: acc.calls + r.total_api_calls,
      failed: acc.failed + r.failed_calls,
    }),
    { cost: 0, tokens: 0, calls: 0, failed: 0 }
  );

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <PanelTitle>AI Usage & Costs — Last 30 Days</PanelTitle>
        {data && <FreshnessTag dataAsOf={data.data_as_of} />}
      </div>

      {loading && <LoadingSkeleton rows={4} />}
      {error && <ErrorState message={error} onRetry={load} />}

      {data && !loading && totals && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Summary row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
            <div style={statCardStyle}>
              <span style={bigNumStyle}>${totals.cost.toFixed(2)}</span>
              <span style={labelStyle}>Total Spend</span>
            </div>
            <div style={statCardStyle}>
              <span style={bigNumStyle}>{(totals.tokens / 1_000_000).toFixed(2)}M</span>
              <span style={labelStyle}>Tokens Burned</span>
            </div>
            <div style={statCardStyle}>
              <span style={bigNumStyle}>{totals.calls.toLocaleString()}</span>
              <span style={labelStyle}>API Calls</span>
            </div>
            <div style={{ ...statCardStyle }}>
              <span style={{ ...bigNumStyle, color: totals.failed > 0 ? "#ef4444" : "#10b981" }}>
                {totals.failed > 0
                  ? `${((totals.failed / totals.calls) * 100).toFixed(1)}%`
                  : "0%"}
              </span>
              <span style={labelStyle}>Failure Rate</span>
            </div>
          </div>

          {/* Daily table — last 7 rows */}
          <div style={{ overflow: "hidden", borderRadius: "8px", border: "1px solid #21262d" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#0d1117" }}>
                  {["Date", "DAU", "Tokens", "Cost", "Calls", "Fail%", "Latency"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.slice(0, 7).map((row, i) => (
                  <tr key={row.metric_date} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                    <td style={tdStyle}>{new Date(row.metric_date).toLocaleDateString("en", { month: "short", day: "numeric" })}</td>
                    <td style={tdStyle}>{row.daily_active_users}</td>
                    <td style={tdStyle}>{row.total_tokens_burned != null ? `${(row.total_tokens_burned / 1000).toFixed(0)}k` : "—"}</td>
                    <td style={tdStyle}>${(row.total_cost_usd ?? 0).toFixed(3)}</td>
                    <td style={tdStyle}>{row.total_api_calls.toLocaleString()}</td>
                    <td style={{ ...tdStyle, color: (row.failure_rate_pct ?? 0) > 5 ? "#ef4444" : "#10b981" }}>
                      {row.failure_rate_pct != null ? `${row.failure_rate_pct}%` : "0%"}
                    </td>
                    <td style={tdStyle}>{row.avg_latency_ms != null ? `${row.avg_latency_ms}ms` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

const statCardStyle: React.CSSProperties = {
  background: "#0d1117", borderRadius: "8px", padding: "12px",
  display: "flex", flexDirection: "column", gap: "4px",
};
const bigNumStyle: React.CSSProperties = {
  fontSize: "20px", fontWeight: 700, color: "#e6edf3",
  fontVariantNumeric: "tabular-nums", lineHeight: 1,
};
const labelStyle: React.CSSProperties = { fontSize: "11px", color: "#7d8590" };
const thStyle: React.CSSProperties = {
  padding: "8px 10px", textAlign: "left", color: "#7d8590",
  fontWeight: 600, fontSize: "11px", letterSpacing: "0.04em",
};
const tdStyle: React.CSSProperties = {
  padding: "8px 10px", color: "#b1bac4",
  borderTop: "1px solid #21262d",
};
