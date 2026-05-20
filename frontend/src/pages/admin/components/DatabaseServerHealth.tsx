import { useEffect, useState } from "react";
import { adminApi, type DatabaseServerHealthResponse } from "@/api/admin";
import { PanelTitle, StatBlock, LoadingSkeleton, ErrorState } from "./AdminPanelWrapper";

function HitRatioBar({ ratio, label }: { ratio: number | null; label: string }) {
  const pct = ratio != null ? Math.round(ratio * 100) : null;
  const color = pct == null ? "#484f58" : pct >= 99 ? "#10b981" : pct >= 95 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "11px", color: "#7d8590" }}>{label}</span>
        <span style={{ fontSize: "11px", color, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {pct != null ? `${pct}%` : "N/A"}
        </span>
      </div>
      <div style={{ height: "4px", background: "#21262d", borderRadius: "2px", overflow: "hidden" }}>
        {pct != null && (
          <div style={{
            width: `${pct}%`, height: "100%",
            background: color,
            borderRadius: "2px",
            transition: "width 0.6s ease",
          }} />
        )}
      </div>
    </div>
  );
}

export function DatabaseServerHealth() {
  const [data, setData] = useState<DatabaseServerHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true); setError("");
    adminApi.getDbHealth().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  return (
    <>
      <PanelTitle>Primary Database Health</PanelTitle>
      {loading && <LoadingSkeleton rows={4} />}
      {error && <ErrorState message={error} onRetry={load} />}
      {data && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            <StatBlock label="Database Size" value={data.db_size_human} />
            <StatBlock
              label="Active Connections"
              value={data.active_connections}
              color={data.active_connections > 40 ? "#f59e0b" : "#e6edf3"}
            />
            <StatBlock
              label="Idle in Transaction"
              value={data.idle_in_transaction}
              color={data.idle_in_transaction > 5 ? "#ef4444" : "#e6edf3"}
            />
          </div>

          {/* Hit ratio bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <HitRatioBar ratio={data.table_cache_hit_ratio} label="Table cache hit ratio" />
            <HitRatioBar ratio={data.index_cache_hit_ratio} label="Index cache hit ratio" />
          </div>

          {/* Secondary stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
            <StatBlock
              label="Long Running Queries (>30s)"
              value={data.long_running_queries}
              color={data.long_running_queries > 0 ? "#f59e0b" : "#10b981"}
            />
            <StatBlock
              label="Autovacuum Workers"
              value={data.autovacuum_workers_active}
            />
          </div>

          {data.total_dead_tuples != null && data.total_dead_tuples > 100000 && (
            <div style={{
              padding: "8px 12px", borderRadius: "6px",
              background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)",
              fontSize: "12px", color: "#f59e0b",
            }}>
              ⚠ {data.total_dead_tuples.toLocaleString()} dead tuples — autovacuum may be falling behind
            </div>
          )}
        </div>
      )}
    </>
  );
}
