import { useEffect, useState } from "react";
import { adminApi, type DocumentPipelineResponse } from "@/api/admin";
import { PanelTitle, FreshnessTag, LoadingSkeleton, ErrorState } from "./AdminPanelWrapper";

const STATUS_ORDER = ["failed", "pending", "parsing", "parsed", "chunking", "completed"];
const STATUS_COLOR: Record<string, string> = {
  failed:    "#ef4444",
  pending:   "#7d8590",
  parsing:   "#60a5fa",
  parsed:    "#a78bfa",
  chunking:  "#f59e0b",
  completed: "#10b981",
};

export function DocumentIngestionFunnel() {
  const [data, setData] = useState<DocumentPipelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true); setError("");
    adminApi.getDocumentPipeline().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const total = data?.pipeline.reduce((s, r) => s + r.document_count, 0) ?? 0;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <PanelTitle>Document Ingestion Pipeline</PanelTitle>
        {data && <FreshnessTag dataAsOf={data.data_as_of} />}
      </div>

      {loading && <LoadingSkeleton rows={6} />}
      {error && <ErrorState message={error} onRetry={load} />}

      {data && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Stuck documents alert */}
          {(data.stuck_parsing > 0 || data.stuck_chunking > 0) && (
            <div style={{
              padding: "8px 12px", borderRadius: "6px",
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
              fontSize: "12px", color: "#ef4444", display: "flex", gap: "8px", alignItems: "center",
            }}>
              <span>⚠</span>
              <span>
                {data.stuck_parsing > 0 && `${data.stuck_parsing} stuck in PARSING`}
                {data.stuck_parsing > 0 && data.stuck_chunking > 0 && " · "}
                {data.stuck_chunking > 0 && `${data.stuck_chunking} stuck in CHUNKING`}
                {" (>1 hour)"}
              </span>
            </div>
          )}

          {/* Funnel bars */}
          {STATUS_ORDER.map((status) => {
            const row = data.pipeline.find((r) => r.processing_status === status);
            const count = row?.document_count ?? 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            const color = STATUS_COLOR[status] ?? "#7d8590";
            return (
              <div key={status} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{
                  width: "72px", fontSize: "11px", fontWeight: 600,
                  color, textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0,
                }}>
                  {status}
                </span>
                <div style={{ flex: 1, height: "6px", background: "#21262d", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{
                    width: `${pct}%`, minWidth: count > 0 ? "4px" : "0",
                    height: "100%", background: color, borderRadius: "3px",
                    transition: "width 0.8s ease",
                  }} />
                </div>
                <span style={{ width: "52px", textAlign: "right", fontSize: "12px", color: "#e6edf3", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                  {count.toLocaleString()}
                </span>
                {row?.total_size_human && (
                  <span style={{ width: "56px", fontSize: "11px", color: "#484f58", textAlign: "right" }}>
                    {row.total_size_human}
                  </span>
                )}
              </div>
            );
          })}

          {/* Total */}
          <div style={{
            borderTop: "1px solid #21262d", paddingTop: "8px",
            display: "flex", justifyContent: "space-between",
            fontSize: "12px", color: "#7d8590",
          }}>
            <span>Total documents</span>
            <span style={{ color: "#e6edf3", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {total.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
