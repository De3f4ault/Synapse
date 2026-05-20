import { useEffect, useState } from "react";
import { adminApi, type LearningActivityResponse } from "@/api/admin";
import { PanelTitle, FreshnessTag, LoadingSkeleton, ErrorState } from "./AdminPanelWrapper";

export function PlatformLearningActivity() {
  const [data, setData] = useState<LearningActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true); setError("");
    adminApi.getLearningActivity(30).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const totals = data?.rows.reduce(
    (acc, r) => ({
      sessions: acc.sessions + r.completed_sessions,
      minutes: acc.minutes + (r.total_study_minutes ?? 0),
      reviews: acc.reviews + r.flashcard_reviews,
      quizzes: acc.quizzes + r.quiz_attempts,
      peakLearners: Math.max(acc.peakLearners, r.active_learners),
    }),
    { sessions: 0, minutes: 0, reviews: 0, quizzes: 0, peakLearners: 0 }
  );

  const avgAccuracy = data?.rows.length
    ? data.rows
        .filter((r) => r.platform_avg_accuracy != null)
        .reduce((s, r) => s + (r.platform_avg_accuracy ?? 0), 0) /
      Math.max(1, data.rows.filter((r) => r.platform_avg_accuracy != null).length)
    : null;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <PanelTitle>Platform Learning Activity — Last 30 Days</PanelTitle>
        {data && <FreshnessTag dataAsOf={data.data_as_of} />}
      </div>

      {loading && <LoadingSkeleton rows={4} />}
      {error && <ErrorState message={error} onRetry={load} />}

      {data && !loading && totals && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Summary stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            {[
              { label: "Study Hours", value: `${Math.round(totals.minutes / 60).toLocaleString()}h` },
              { label: "Peak DAL", value: totals.peakLearners, sub: "daily active learners" },
              { label: "Avg Accuracy", value: avgAccuracy != null ? `${(avgAccuracy * 100).toFixed(1)}%` : "—", color: avgAccuracy != null && avgAccuracy >= 0.7 ? "#10b981" : "#f59e0b" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#0d1117", borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ fontSize: "20px", fontWeight: 700, color: (s as any).color ?? "#e6edf3", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                  {String(s.value)}
                </div>
                <div style={{ fontSize: "11px", color: "#7d8590", marginTop: "2px" }}>{s.label}</div>
                {(s as any).sub && <div style={{ fontSize: "10px", color: "#484f58" }}>{(s as any).sub}</div>}
              </div>
            ))}
          </div>

          {/* Activity breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
            {[
              { label: "Flashcard Reviews", value: totals.reviews.toLocaleString(), color: "#a78bfa" },
              { label: "Quiz Attempts", value: totals.quizzes.toLocaleString(), color: "#60a5fa" },
              { label: "Completed Sessions", value: totals.sessions.toLocaleString(), color: "#34d399" },
            ].map((s) => (
              <div key={s.label} style={{
                padding: "10px 12px", background: "#0d1117", borderRadius: "8px",
                borderLeft: `3px solid ${s.color}`,
              }}>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#e6edf3", fontVariantNumeric: "tabular-nums" }}>
                  {s.value}
                </div>
                <div style={{ fontSize: "11px", color: "#7d8590" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Activity sparkline — active learners per day */}
          <div>
            <p style={{ fontSize: "11px", color: "#7d8590", margin: "0 0 8px 0", fontWeight: 600 }}>Daily Active Learners (last 30 days)</p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "48px" }}>
              {data.rows.slice(0, 30).reverse().map((row, i) => {
                const maxVal = Math.max(...data.rows.map((r) => r.active_learners), 1);
                const h = Math.max(Math.round((row.active_learners / maxVal) * 48), 2);
                return (
                  <div
                    key={i}
                    title={`${new Date(row.day).toLocaleDateString()} — ${row.active_learners} learners`}
                    style={{
                      flex: 1, height: `${h}px`, background: "#a78bfa",
                      borderRadius: "2px 2px 0 0", opacity: 0.6 + (i / 30) * 0.4,
                      transition: "height 0.4s ease",
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
