/**
 * AdminDashboard — God's-eye platform management dashboard.
 *
 * Forces its own dark theme independent of the app's light/dark toggle.
 * Renders inside <AdminAuthGuard> which guarantees user.is_admin = true.
 *
 * Layout:
 *   Top bar — replication canary (always visible, highest severity wins)
 *   Left sidebar — section navigation (11 panels in 6 groups)
 *   Main content — responsive 2-col grid, each panel wrapped in AdminPanelWrapper
 */
import "./admin.css";
import { useState, type ReactNode } from "react";
import { AdminPanelWrapper } from "./components/AdminPanelWrapper";
import { DatabaseReplicationStatus } from "./components/DatabaseReplicationStatus";
import { DatabaseServerHealth } from "./components/DatabaseServerHealth";
import { AIUsageCosts } from "./components/AIUsageCosts";
import { AIAgentPerformance } from "./components/AIAgentPerformance";
import { DocumentIngestionFunnel } from "./components/DocumentIngestionFunnel";
import { QdrantVectorHealth } from "./components/QdrantVectorHealth";
import { CeleryWorkerStatus } from "./components/CeleryWorkerStatus";
import { WebhookDeliveryStats } from "./components/WebhookDeliveryStats";
import { PlatformLearningActivity } from "./components/PlatformLearningActivity";
import { AutomationWorkflowStats } from "./components/AutomationWorkflowStats";
import { UserManagement } from "./components/UserManagement";
import { useAuthStore } from "@/stores/authStore";

type Section =
  | "infrastructure"
  | "ai-costs"
  | "agents"
  | "ingestion"
  | "workers"
  | "learning"
  | "users";

interface NavItem {
  id: Section;
  label: string;
  icon: string;
  group: string;
}

const NAV: NavItem[] = [
  { id: "infrastructure", label: "Infrastructure",    icon: "⬡", group: "System" },
  { id: "workers",        label: "Workers & Queues",  icon: "⚙", group: "System" },
  { id: "ai-costs",       label: "AI Costs",          icon: "◈", group: "Intelligence" },
  { id: "agents",         label: "Agent Performance", icon: "◉", group: "Intelligence" },
  { id: "ingestion",      label: "Ingestion Pipeline",icon: "↓", group: "Data" },
  { id: "learning",       label: "Learning Activity", icon: "◎", group: "Data" },
  { id: "users",          label: "User Management",   icon: "⊕", group: "Platform" },
];

export function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<Section>("infrastructure");
  const user = useAuthStore((s) => s.user);

  const shell: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#0d1117",
    color: "#e6edf3",
    fontFamily: "'Roboto', system-ui, -apple-system, sans-serif",
    overflow: "hidden",
  };

  const topBar: React.CSSProperties = {
    height: "48px",
    borderBottom: "1px solid #21262d",
    display: "flex",
    alignItems: "center",
    padding: "0 20px",
    gap: "16px",
    background: "#161b22",
    flexShrink: 0,
    zIndex: 10,
  };

  const body: React.CSSProperties = {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  };

  const sidebar: React.CSSProperties = {
    width: "200px",
    flexShrink: 0,
    borderRight: "1px solid #21262d",
    background: "#0d1117",
    overflowY: "auto",
    padding: "16px 0",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  };

  const main: React.CSSProperties = {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  };

  // Group nav items
  const groups = Array.from(new Set(NAV.map((n) => n.group)));

  return (
    <div style={shell}>
      {/* ── Top bar ── */}
      <div style={topBar}>
        <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "#c96442", textTransform: "uppercase" }}>
          Synapse
        </span>
        <span style={{ fontSize: "12px", color: "#7d8590", fontWeight: 600 }}>Admin Console</span>

        {/* Replication canary — always visible */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <ReplicationCanaryBar />
        </div>

        <span style={{ fontSize: "11px", color: "#484f58", marginLeft: "auto" }}>
          {user?.email}
        </span>
        <a
          href="/dashboard"
          style={{ fontSize: "11px", color: "#7d8590", textDecoration: "none", padding: "4px 10px",
            border: "1px solid #30363d", borderRadius: "6px" }}
        >
          ← App
        </a>
      </div>

      {/* ── Body ── */}
      <div style={body}>
        {/* Sidebar */}
        <nav style={sidebar}>
          {groups.map((group) => (
            <div key={group}>
              <p style={{
                fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em",
                color: "#484f58", textTransform: "uppercase",
                padding: "8px 16px 4px", margin: 0,
              }}>
                {group}
              </p>
              {NAV.filter((n) => n.group === group).map((item) => {
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    id={`admin-nav-${item.id}`}
                    onClick={() => setActiveSection(item.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      width: "100%", padding: "8px 16px",
                      background: active ? "rgba(199,100,66,0.12)" : "transparent",
                      border: "none",
                      borderLeft: `2px solid ${active ? "#c96442" : "transparent"}`,
                      cursor: "pointer",
                      color: active ? "#e6edf3" : "#7d8590",
                      fontSize: "13px",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span style={{ fontSize: "14px", width: "18px", textAlign: "center", opacity: 0.7 }}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Main panel grid */}
        <main style={main}>
          <SectionContent section={activeSection} />
        </main>
      </div>
    </div>
  );
}

// ─── Section router ───────────────────────────────────────────────────────────

function SectionContent({ section }: { section: Section }) {
  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "16px",
    animation: "admin-fade-in 0.25s ease",
  };
  const fullWidth: React.CSSProperties = { gridColumn: "span 2" };

  switch (section) {
    case "infrastructure":
      return (
        <div style={gridStyle}>
          <div style={fullWidth}>
            <AdminPanelWrapper title="Replication Health" height={200} wide>
              <DatabaseReplicationStatus />
            </AdminPanelWrapper>
          </div>
          <AdminPanelWrapper title="Primary DB Health" height={280}>
            <DatabaseServerHealth />
          </AdminPanelWrapper>
          <AdminPanelWrapper title="Qdrant Vector Health" height={280}>
            <QdrantVectorHealth />
          </AdminPanelWrapper>
        </div>
      );
    case "workers":
      return (
        <div style={gridStyle}>
          <AdminPanelWrapper title="Celery Workers" height={320}>
            <CeleryWorkerStatus />
          </AdminPanelWrapper>
          <AdminPanelWrapper title="Webhook Delivery" height={320}>
            <WebhookDeliveryStats />
          </AdminPanelWrapper>
          <div style={fullWidth}>
            <AdminPanelWrapper title="Automation Workflows" height={260} wide>
              <AutomationWorkflowStats />
            </AdminPanelWrapper>
          </div>
        </div>
      );
    case "ai-costs":
      return (
        <div style={{ display: "grid", gap: "16px", animation: "admin-fade-in 0.25s ease" }}>
          <AdminPanelWrapper title="AI Usage & Costs" height={380} wide>
            <AIUsageCosts />
          </AdminPanelWrapper>
        </div>
      );
    case "agents":
      return (
        <div style={{ display: "grid", gap: "16px", animation: "admin-fade-in 0.25s ease" }}>
          <AdminPanelWrapper title="Agent Performance" height={400} wide>
            <AIAgentPerformance />
          </AdminPanelWrapper>
        </div>
      );
    case "ingestion":
      return (
        <div style={gridStyle}>
          <div style={fullWidth}>
            <AdminPanelWrapper title="Document Pipeline" height={360} wide>
              <DocumentIngestionFunnel />
            </AdminPanelWrapper>
          </div>
        </div>
      );
    case "learning":
      return (
        <div style={{ display: "grid", gap: "16px", animation: "admin-fade-in 0.25s ease" }}>
          <AdminPanelWrapper title="Platform Learning Activity" height={420} wide>
            <PlatformLearningActivity />
          </AdminPanelWrapper>
        </div>
      );
    case "users":
      return (
        <div style={{ display: "grid", gap: "16px", animation: "admin-fade-in 0.25s ease" }}>
          <AdminPanelWrapper title="User Management" height={520} wide>
            <UserManagement />
          </AdminPanelWrapper>
        </div>
      );
    default:
      return null;
  }
}

// ─── Replication canary bar (always visible in topbar) ────────────────────────

function ReplicationCanaryBar() {
  const [status, setStatus] = useState<"OK" | "WARNING" | "CRITICAL" | "UNKNOWN" | "loading">("loading");

  useState(() => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    import("@/api/admin").then(({ adminApi }) => {
      adminApi.getReplicationHealth()
        .then((data) => {
          const slots = data.primary_slots.map((s) => s.severity);
          const sub = data.replica_subscription?.severity ?? "UNKNOWN";
          const all = [...slots, sub];
          if (all.includes("CRITICAL")) setStatus("CRITICAL");
          else if (all.includes("WARNING")) setStatus("WARNING");
          else if (all.includes("UNKNOWN")) setStatus("UNKNOWN");
          else setStatus("OK");
        })
        .catch(() => setStatus("UNKNOWN"));
    });
  });

  const map = {
    loading:  { color: "#484f58", dot: "#484f58", label: "Checking replication..." },
    OK:       { color: "#10b981", dot: "#10b981", label: "Replication healthy" },
    WARNING:  { color: "#f59e0b", dot: "#f59e0b", label: "Replication lag elevated" },
    CRITICAL: { color: "#ef4444", dot: "#ef4444", label: "Replication critical" },
    UNKNOWN:  { color: "#7d8590", dot: "#7d8590", label: "Replica not connected" },
  };
  const cfg = map[status];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div style={{
        width: "7px", height: "7px", borderRadius: "50%",
        background: cfg.dot,
        boxShadow: status === "OK" ? `0 0 5px ${cfg.dot}` : undefined,
        animation: status === "loading" ? "none" : undefined,
      }} />
      <span style={{ fontSize: "11px", color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
    </div>
  );
}
