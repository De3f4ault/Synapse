import { useEffect, useState } from "react";
import { adminApi, type WorkflowExecutionResponse } from "@/api/admin";
import { PanelTitle, FreshnessTag, LoadingSkeleton, ErrorState } from "./AdminPanelWrapper";

const TRIGGER_COLOR: Record<string, string> = {
  CONSUMPTION:      "#a78bfa",
  DOCUMENT_ADDED:   "#60a5fa",
  DOCUMENT_UPDATED: "#f59e0b",
  SCHEDULED:        "#34d399",
};

export function AutomationWorkflowStats() {
  const [data, setData] = useState<WorkflowExecutionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true); setError("");
    adminApi.getWorkflowStats(12).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // Aggregate by trigger type
  const byTrigger = data?.rows.reduce<Record<string, { executions: number; docs: number }>>((acc, r) => {
    if (!acc[r.trigger_label]) acc[r.trigger_label] = { executions: 0, docs: 0 };
    acc[r.trigger_label].executions += r.total_executions;
    acc[r.trigger_label].docs += r.unique_docs_processed;
    return acc;
  }, {});

  const totalExecutions = byTrigger
    ? Object.values(byTrigger).reduce((s, v) => s + v.executions, 0)
    : 0;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <PanelTitle>Automation Workflows — Last 12 Weeks</PanelTitle>
        {data && <FreshnessTag dataAsOf={data.data_as_of} />}
      </div>

      {loading && <LoadingSkeleton rows={4} />}
      {error && <ErrorState message={error} onRetry={load} />}

      {data && !loading && byTrigger && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "24px", fontWeight: 700, color: "#e6edf3", fontVariantNumeric: "tabular-nums" }}>
              {totalExecutions.toLocaleString()}
            </span>
            <span style={{ fontSize: "12px", color: "#7d8590" }}>total workflow executions</span>
          </div>

          {/* Breakdown by trigger */}
          {Object.entries(byTrigger).map(([trigger, stats]) => {
            const color = TRIGGER_COLOR[trigger] ?? "#7d8590";
            const pct = totalExecutions > 0 ? (stats.executions / totalExecutions) * 100 : 0;
            return (
              <div key={trigger} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{
                    fontSize: "11px", fontWeight: 600, color, fontFamily: "monospace",
                    textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>
                    {trigger.replace(/_/g, " ")}
                  </span>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#e6edf3", fontVariantNumeric: "tabular-nums" }}>
                      {stats.executions.toLocaleString()}
                    </span>
                    <span style={{ fontSize: "11px", color: "#484f58", marginLeft: "6px" }}>
                      {stats.docs.toLocaleString()} docs
                    </span>
                  </div>
                </div>
                <div style={{ height: "5px", background: "#21262d", borderRadius: "3px" }}>
                  <div style={{
                    width: `${pct}%`, minWidth: stats.executions > 0 ? "4px" : "0",
                    height: "100%", background: color, borderRadius: "3px",
                    transition: "width 0.7s ease",
                  }} />
                </div>
              </div>
            );
          })}

          {totalExecutions === 0 && (
            <p style={{ fontSize: "13px", color: "#484f58", textAlign: "center", padding: "16px 0" }}>
              No workflow executions in the last 12 weeks
            </p>
          )}
        </div>
      )}
    </>
  );
}
