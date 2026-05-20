import { useEffect, useState } from "react";
import { adminApi, type ReplicationHealthResponse } from "@/api/admin";
import { PanelTitle, StatusBadge, FreshnessTag, LoadingSkeleton, ErrorState } from "./AdminPanelWrapper";

export function DatabaseReplicationStatus() {
  const [data, setData] = useState<ReplicationHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    adminApi.getReplicationHealth()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const overallSeverity = (): "OK" | "WARNING" | "CRITICAL" | "UNKNOWN" => {
    if (!data) return "UNKNOWN";
    const slotSevs = data.primary_slots.map((s) => s.severity);
    const subSev = data.replica_subscription?.severity ?? "UNKNOWN";
    const all = [...slotSevs, subSev];
    if (all.includes("CRITICAL")) return "CRITICAL";
    if (all.includes("WARNING")) return "WARNING";
    if (all.includes("UNKNOWN")) return "UNKNOWN";
    return "OK";
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <PanelTitle>Replication Health</PanelTitle>
        {data && <StatusBadge severity={overallSeverity()} />}
        {data && <FreshnessTag dataAsOf={data.data_as_of} />}
      </div>

      {loading && <LoadingSkeleton rows={3} />}
      {error && <ErrorState message={error} onRetry={load} />}

      {data && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Primary side: replication slots */}
          <div>
            <p style={{ fontSize: "11px", color: "#7d8590", margin: "0 0 8px 0", fontWeight: 600 }}>PRIMARY — Replication Slots</p>
            {data.primary_slots.length === 0 ? (
              <p style={{ fontSize: "12px", color: "#484f58", margin: 0 }}>No logical replication slots found</p>
            ) : (
              data.primary_slots.map((slot) => (
                <div key={slot.slot_name} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "10px 12px", background: "#0d1117",
                  borderRadius: "8px", marginBottom: "6px",
                }}>
                  <div style={{
                    width: "8px", height: "8px", borderRadius: "50%",
                    background: slot.active ? "#10b981" : "#ef4444",
                    flexShrink: 0,
                    boxShadow: slot.active ? "0 0 6px rgba(16,185,129,0.5)" : undefined,
                  }} />
                  <span style={{ fontSize: "12px", color: "#e6edf3", fontFamily: "monospace", flex: 1 }}>
                    {slot.slot_name}
                  </span>
                  <span style={{ fontSize: "12px", color: "#7d8590" }}>{slot.wal_lag_human} lag</span>
                  <StatusBadge severity={slot.severity} />
                </div>
              ))
            )}
          </div>

          {/* Replica side: subscription */}
          <div>
            <p style={{ fontSize: "11px", color: "#7d8590", margin: "0 0 8px 0", fontWeight: 600 }}>REPLICA — Subscription Worker</p>
            {!data.replica_subscription ? (
              <p style={{ fontSize: "12px", color: "#484f58", margin: 0 }}>Replica not connected</p>
            ) : (
              <div style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "10px 12px", background: "#0d1117", borderRadius: "8px",
              }}>
                <div style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: data.replica_subscription.subenabled ? "#10b981" : "#ef4444",
                  flexShrink: 0,
                  boxShadow: data.replica_subscription.subenabled ? "0 0 6px rgba(16,185,129,0.5)" : undefined,
                }} />
                <span style={{ fontSize: "12px", color: "#e6edf3", fontFamily: "monospace", flex: 1 }}>
                  {data.replica_subscription.subname}
                </span>
                {data.replica_subscription.seconds_since_last_receive != null && (
                  <span style={{ fontSize: "12px", color: "#7d8590" }}>
                    {Math.round(data.replica_subscription.seconds_since_last_receive)}s since last receive
                  </span>
                )}
                <StatusBadge severity={data.replica_subscription.severity} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
