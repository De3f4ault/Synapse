import { useEffect, useState } from "react";
import { adminApi, type QdrantHealthResponse } from "@/api/admin";
import { PanelTitle, LoadingSkeleton, ErrorState } from "./AdminPanelWrapper";

export function QdrantVectorHealth() {
  const [data, setData] = useState<QdrantHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true); setError("");
    adminApi.getQdrantHealth().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  return (
    <>
      <PanelTitle>Qdrant Vector Store</PanelTitle>
      {loading && <LoadingSkeleton rows={3} />}
      {error && <ErrorState message={error} onRetry={load} />}
      {data && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "20px", fontWeight: 700, color: "#e6edf3" }}>
              {data.total_collections}
            </span>
            <span style={{ fontSize: "12px", color: "#7d8590" }}>collections</span>
          </div>
          {data.collections.map((col) => {
            const statusColor =
              col.status === "green" || col.status === "ok" ? "#10b981"
              : col.status === "yellow" ? "#f59e0b"
              : "#ef4444";
            return (
              <div key={col.collection_name} style={{
                padding: "10px 12px", background: "#0d1117",
                borderRadius: "8px", display: "grid",
                gridTemplateColumns: "1fr auto auto auto",
                alignItems: "center", gap: "16px",
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#e6edf3", fontFamily: "monospace" }}>
                    {col.collection_name}
                  </p>
                  <p style={{ margin: 0, fontSize: "10px", color: "#484f58" }}>
                    {col.optimizer_ok ? "optimizer OK" : "⚠ optimizer degraded"}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#e6edf3", fontVariantNumeric: "tabular-nums" }}>
                    {(col.points_count ?? 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: "10px", color: "#484f58" }}>points</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#e6edf3", fontVariantNumeric: "tabular-nums" }}>
                    {(col.indexed_vector_count ?? 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: "10px", color: "#484f58" }}>indexed</div>
                </div>
                <span style={{
                  fontSize: "10px", fontWeight: 700, padding: "2px 8px",
                  borderRadius: "9999px", letterSpacing: "0.06em",
                  background: `${statusColor}22`, color: statusColor,
                }}>
                  {col.status.toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
