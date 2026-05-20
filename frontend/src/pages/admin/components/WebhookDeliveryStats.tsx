import { useEffect, useState } from "react";
import { adminApi, type WebhookDeliveryResponse } from "@/api/admin";
import { PanelTitle, FreshnessTag, LoadingSkeleton, ErrorState } from "./AdminPanelWrapper";

export function WebhookDeliveryStats() {
  const [data, setData] = useState<WebhookDeliveryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true); setError("");
    adminApi.getWebhookDelivery(14).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // Aggregate totals
  const totals = data?.rows.reduce(
    (acc, r) => ({
      total: acc.total + r.total_deliveries,
      ok: acc.ok + r.successful,
      failed: acc.failed + r.failed,
    }),
    { total: 0, ok: 0, failed: 0 }
  );

  const overallRate = totals && totals.total > 0
    ? ((totals.ok / totals.total) * 100).toFixed(1)
    : null;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <PanelTitle>Webhook Delivery — Last 14 Days</PanelTitle>
        {data && <FreshnessTag dataAsOf={data.data_as_of} />}
      </div>

      {loading && <LoadingSkeleton rows={4} />}
      {error && <ErrorState message={error} onRetry={load} />}

      {data && !loading && totals && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
            {[
              { label: "Total Deliveries", value: totals.total.toLocaleString() },
              { label: "Successful", value: totals.ok.toLocaleString(), color: "#10b981" },
              { label: "Failed", value: totals.failed.toLocaleString(), color: totals.failed > 0 ? "#ef4444" : "#10b981" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#0d1117", borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ fontSize: "18px", fontWeight: 700, color: s.color ?? "#e6edf3", fontVariantNumeric: "tabular-nums" }}>
                  {s.value}
                </div>
                <div style={{ fontSize: "11px", color: "#7d8590" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Success rate bar */}
          {overallRate && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "11px", color: "#7d8590" }}>Overall success rate</span>
                <span style={{
                  fontSize: "12px", fontWeight: 700, fontVariantNumeric: "tabular-nums",
                  color: parseFloat(overallRate) >= 98 ? "#10b981" : parseFloat(overallRate) >= 90 ? "#f59e0b" : "#ef4444",
                }}>
                  {overallRate}%
                </span>
              </div>
              <div style={{ height: "6px", background: "#21262d", borderRadius: "3px" }}>
                <div style={{
                  width: `${overallRate}%`, height: "100%", borderRadius: "3px",
                  background: parseFloat(overallRate) >= 98 ? "#10b981" : parseFloat(overallRate) >= 90 ? "#f59e0b" : "#ef4444",
                  transition: "width 0.8s ease",
                }} />
              </div>
            </div>
          )}

          {/* By event type — aggregate across all days */}
          <div style={{ overflow: "hidden", borderRadius: "8px", border: "1px solid #21262d" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#0d1117" }}>
                  {["Event Type", "Delivered", "Failed", "Success %", "Avg Attempts"].map((h) => (
                    <th key={h} style={{ padding: "7px 10px", textAlign: "left", color: "#7d8590", fontWeight: 600, fontSize: "11px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(
                  data.rows.reduce<Record<string, { ok: number; fail: number; total: number; attempts: number[] }>>((acc, r) => {
                    if (!acc[r.event_type]) acc[r.event_type] = { ok: 0, fail: 0, total: 0, attempts: [] };
                    acc[r.event_type].ok += r.successful;
                    acc[r.event_type].fail += r.failed;
                    acc[r.event_type].total += r.total_deliveries;
                    if (r.avg_attempts_per_delivery != null) acc[r.event_type].attempts.push(r.avg_attempts_per_delivery);
                    return acc;
                  }, {})
                ).map(([type, stats], i) => {
                  const rate = stats.total > 0 ? ((stats.ok / stats.total) * 100).toFixed(1) : "—";
                  const avgAttempts = stats.attempts.length
                    ? (stats.attempts.reduce((a, b) => a + b, 0) / stats.attempts.length).toFixed(2)
                    : "—";
                  return (
                    <tr key={type} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                      <td style={{ padding: "7px 10px", color: "#b1bac4", borderTop: "1px solid #21262d", fontFamily: "monospace", fontSize: "11px" }}>{type}</td>
                      <td style={{ padding: "7px 10px", color: "#10b981", borderTop: "1px solid #21262d", fontVariantNumeric: "tabular-nums" }}>{stats.ok}</td>
                      <td style={{ padding: "7px 10px", color: stats.fail > 0 ? "#ef4444" : "#7d8590", borderTop: "1px solid #21262d", fontVariantNumeric: "tabular-nums" }}>{stats.fail}</td>
                      <td style={{ padding: "7px 10px", color: "#b1bac4", borderTop: "1px solid #21262d" }}>{rate !== "—" ? `${rate}%` : "—"}</td>
                      <td style={{ padding: "7px 10px", color: "#b1bac4", borderTop: "1px solid #21262d" }}>{avgAttempts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
