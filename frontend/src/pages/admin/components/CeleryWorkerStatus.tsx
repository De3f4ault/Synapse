import { useEffect, useState } from "react";
import { adminApi, type CeleryWorkerResponse } from "@/api/admin";
import { PanelTitle, LoadingSkeleton, ErrorState } from "./AdminPanelWrapper";

const QUEUE_COLORS: Record<string, string> = {
  rag: "#a78bfa",
  embeddings: "#60a5fa",
  ingestion: "#34d399",
  ocr: "#f59e0b",
  default: "#7d8590",
  celery: "#7d8590",
};

export function CeleryWorkerStatus() {
  const [data, setData] = useState<CeleryWorkerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true); setError("");
    adminApi.getWorkerStatus().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  return (
    <>
      <PanelTitle>Celery Workers & Queues</PanelTitle>
      {loading && <LoadingSkeleton rows={4} />}
      {error && <ErrorState message={error} onRetry={load} />}

      {data && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Worker summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            {[
              { label: "Workers Online", value: data.worker_count, color: data.worker_count > 0 ? "#10b981" : "#ef4444" },
              { label: "Active Tasks", value: data.total_active_tasks },
              { label: "Nodes", value: data.active_workers.length },
            ].map((s) => (
              <div key={s.label} style={{ background: "#0d1117", borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ fontSize: "18px", fontWeight: 700, color: s.color ?? "#e6edf3", fontVariantNumeric: "tabular-nums" }}>
                  {s.value}
                </div>
                <div style={{ fontSize: "11px", color: "#7d8590" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Queue depths */}
          <div>
            <p style={{ fontSize: "11px", color: "#7d8590", fontWeight: 600, margin: "0 0 6px 0" }}>Queue Depths</p>
            {Object.entries(data.queue_depths).map(([queue, depth]) => {
              const color = QUEUE_COLORS[queue] ?? "#7d8590";
              const isError = depth === -1;
              return (
                <div key={queue} style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "6px 0", borderBottom: "1px solid #21262d",
                }}>
                  <span style={{
                    width: "6px", height: "6px", borderRadius: "50%",
                    background: isError ? "#484f58" : color, flexShrink: 0,
                  }} />
                  <span style={{ flex: 1, fontSize: "12px", color: "#7d8590", fontFamily: "monospace" }}>{queue}</span>
                  <span style={{
                    fontSize: "13px", fontWeight: 700, fontVariantNumeric: "tabular-nums",
                    color: isError ? "#484f58" : depth > 50 ? "#ef4444" : depth > 10 ? "#f59e0b" : "#e6edf3",
                  }}>
                    {isError ? "—" : depth}
                  </span>
                  <span style={{ fontSize: "10px", color: "#484f58", width: "32px", textAlign: "right" }}>tasks</span>
                </div>
              );
            })}
          </div>

          {/* Worker nodes */}
          {data.active_workers.length > 0 && (
            <div>
              <p style={{ fontSize: "11px", color: "#7d8590", fontWeight: 600, margin: "0 0 4px 0" }}>Active Nodes</p>
              {data.active_workers.map((w) => (
                <div key={w} style={{ fontSize: "11px", color: "#484f58", fontFamily: "monospace", padding: "2px 0" }}>
                  • {w}
                </div>
              ))}
            </div>
          )}

          {data.worker_count === 0 && (
            <div style={{
              padding: "8px 12px", borderRadius: "6px",
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
              fontSize: "12px", color: "#ef4444",
            }}>
              ⚠ No Celery workers online — background tasks are not processing
            </div>
          )}
        </div>
      )}
    </>
  );
}
