import { useEffect, useState } from "react";
import { adminApi, type AdminUserRow, type UserListResponse } from "@/api/admin";
import { PanelTitle, LoadingSkeleton, ErrorState } from "./AdminPanelWrapper";

export function UserManagement() {
  const [data, setData] = useState<UserListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [actionPending, setActionPending] = useState<number | null>(null);

  const load = (p = page) => {
    setLoading(true); setError("");
    adminApi.listUsers(p, 15).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(page); }, [page]);

  const handleToggle = async (user: AdminUserRow) => {
    setActionPending(user.id);
    try {
      if (user.is_active) {
        await adminApi.suspendUser(user.id);
      } else {
        await adminApi.reinstateUser(user.id);
      }
      load(page);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionPending(null);
    }
  };

  const totalPages = data ? Math.ceil(data.total / 15) : 1;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <PanelTitle>User Management</PanelTitle>
        {data && (
          <span style={{ fontSize: "11px", color: "#484f58", marginLeft: "auto" }}>
            {data.total.toLocaleString()} total users
          </span>
        )}
      </div>

      {loading && <LoadingSkeleton rows={5} />}
      {error && <ErrorState message={error} onRetry={() => load(page)} />}

      {data && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ overflow: "hidden", borderRadius: "8px", border: "1px solid #21262d" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#0d1117" }}>
                  {["User", "Joined", "Storage", "Docs", "Status", "Role", "Action"].map((h) => (
                    <th key={h} style={{
                      padding: "8px 10px", textAlign: "left",
                      color: "#7d8590", fontWeight: 600, fontSize: "11px",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.users.map((user, i) => (
                  <tr key={user.id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                    <td style={{ padding: "9px 10px", borderTop: "1px solid #21262d" }}>
                      <div style={{ color: "#e6edf3", fontWeight: 500 }}>{user.full_name || "—"}</div>
                      <div style={{ color: "#484f58", fontSize: "11px" }}>{user.email}</div>
                    </td>
                    <td style={{ padding: "9px 10px", borderTop: "1px solid #21262d", color: "#7d8590" }}>
                      {new Date(user.created_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "2-digit" })}
                    </td>
                    <td style={{ padding: "9px 10px", borderTop: "1px solid #21262d", color: "#b1bac4", fontVariantNumeric: "tabular-nums" }}>
                      {user.total_storage_human}
                    </td>
                    <td style={{ padding: "9px 10px", borderTop: "1px solid #21262d", color: "#b1bac4", fontVariantNumeric: "tabular-nums" }}>
                      {user.document_count}
                    </td>
                    <td style={{ padding: "9px 10px", borderTop: "1px solid #21262d" }}>
                      <span style={{
                        fontSize: "10px", fontWeight: 700, padding: "2px 7px",
                        borderRadius: "9999px", letterSpacing: "0.05em",
                        background: user.is_active ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                        color: user.is_active ? "#10b981" : "#ef4444",
                      }}>
                        {user.is_active ? "ACTIVE" : "SUSPENDED"}
                      </span>
                    </td>
                    <td style={{ padding: "9px 10px", borderTop: "1px solid #21262d" }}>
                      {user.is_admin && (
                        <span style={{
                          fontSize: "10px", fontWeight: 700, padding: "2px 7px",
                          borderRadius: "9999px", letterSpacing: "0.05em",
                          background: "rgba(199,100,66,0.15)", color: "#c96442",
                        }}>
                          ADMIN
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "9px 10px", borderTop: "1px solid #21262d" }}>
                      {!user.is_admin && (
                        <button
                          id={`user-action-${user.id}`}
                          onClick={() => handleToggle(user)}
                          disabled={actionPending === user.id}
                          style={{
                            fontSize: "11px", padding: "3px 10px",
                            border: `1px solid ${user.is_active ? "#30363d" : "rgba(16,185,129,0.3)"}`,
                            borderRadius: "6px", cursor: "pointer",
                            background: "transparent",
                            color: user.is_active ? "#7d8590" : "#10b981",
                            opacity: actionPending === user.id ? 0.5 : 1,
                            transition: "all 0.15s ease",
                          }}
                        >
                          {actionPending === user.id ? "..." : user.is_active ? "Suspend" : "Reinstate"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={pageBtnStyle}
              >
                ← Prev
              </button>
              <span style={{ fontSize: "12px", color: "#7d8590" }}>
                Page {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={pageBtnStyle}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

const pageBtnStyle: React.CSSProperties = {
  fontSize: "12px", padding: "4px 12px",
  background: "transparent", border: "1px solid #30363d",
  borderRadius: "6px", color: "#7d8590", cursor: "pointer",
};
