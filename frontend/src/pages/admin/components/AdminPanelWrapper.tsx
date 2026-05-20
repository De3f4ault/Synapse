/**
 * AdminPanelWrapper — Error boundary + loading skeleton for every dashboard panel.
 *
 * Wraps all 11 admin panels. If one panel's API call fails or times out,
 * it shows a degraded "Panel unavailable" state — the rest of the dashboard
 * continues loading and functioning normally.
 *
 * Usage:
 *   <AdminPanelWrapper title="AI Usage Costs" height={320}>
 *     <AIUsageCosts />
 *   </AdminPanelWrapper>
 */
import React, { Component, type ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
  height?: number;
  /** Spans 2 columns in the grid when true */
  wide?: boolean;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class AdminPanelWrapper extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error) {
    console.error(`[AdminPanel: ${this.props.title}]`, error);
  }

  render() {
    const { title, children, height = 280, wide } = this.props;
    const { hasError, errorMessage } = this.state;

    const panelStyle: React.CSSProperties = {
      background: "#161b22",
      border: "1px solid #21262d",
      borderRadius: "10px",
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      gridColumn: wide ? "span 2" : undefined,
      minHeight: height,
      position: "relative",
      overflow: "hidden",
    };

    const titleStyle: React.CSSProperties = {
      fontSize: "12px",
      fontWeight: 600,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: "#7d8590",
      margin: 0,
    };

    if (hasError) {
      return (
        <div style={panelStyle}>
          <p style={titleStyle}>{title}</p>
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            color: "#7d8590",
          }}>
            <span style={{ fontSize: "24px" }}>⚠</span>
            <p style={{ fontSize: "13px", margin: 0, textAlign: "center" }}>
              Panel unavailable
            </p>
            <p style={{ fontSize: "11px", margin: 0, color: "#484f58", textAlign: "center", maxWidth: "200px" }}>
              {errorMessage || "An error occurred loading this panel"}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, errorMessage: "" })}
              style={{
                marginTop: "8px",
                fontSize: "12px",
                padding: "4px 12px",
                background: "transparent",
                border: "1px solid #30363d",
                borderRadius: "6px",
                color: "#7d8590",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return <div style={panelStyle}>{children}</div>;
  }
}

// ─── Reusable sub-components used across panels ────────────────────────────

export function PanelTitle({ children }: { children: ReactNode }) {
  return (
    <p style={{
      fontSize: "12px",
      fontWeight: 600,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: "#7d8590",
      margin: 0,
    }}>
      {children}
    </p>
  );
}

export function StatBlock({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <span style={{
        fontSize: "22px",
        fontWeight: 700,
        color: color ?? "#e6edf3",
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1,
      }}>
        {value}
      </span>
      <span style={{ fontSize: "11px", color: "#7d8590" }}>{label}</span>
      {sub && <span style={{ fontSize: "11px", color: "#484f58" }}>{sub}</span>}
    </div>
  );
}

export function StatusBadge({ severity }: { severity: "OK" | "WARNING" | "CRITICAL" | "UNKNOWN" | string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    OK:       { bg: "rgba(16,185,129,0.15)",  color: "#10b981", label: "OK" },
    WARNING:  { bg: "rgba(245,158,11,0.15)",  color: "#f59e0b", label: "WARNING" },
    CRITICAL: { bg: "rgba(239,68,68,0.15)",   color: "#ef4444", label: "CRITICAL" },
    UNKNOWN:  { bg: "rgba(125,133,144,0.15)", color: "#7d8590", label: "UNKNOWN" },
  };
  const cfg = map[severity] ?? map.UNKNOWN;
  return (
    <span style={{
      fontSize: "10px",
      fontWeight: 700,
      letterSpacing: "0.08em",
      padding: "2px 8px",
      borderRadius: "9999px",
      background: cfg.bg,
      color: cfg.color,
    }}>
      {cfg.label}
    </span>
  );
}

export function FreshnessTag({ dataAsOf }: { dataAsOf: string | null }) {
  if (!dataAsOf) return null;
  const date = new Date(dataAsOf);
  const diffMin = Math.round((Date.now() - date.getTime()) / 60000);
  const label = diffMin < 1 ? "< 1 min ago" : `${diffMin} min ago`;
  return (
    <span style={{ fontSize: "11px", color: "#484f58", marginLeft: "auto" }}>
      Data as of {label}
    </span>
  );
}

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height: "32px",
            borderRadius: "6px",
            background: "linear-gradient(90deg, #21262d 25%, #2d333b 50%, #21262d 75%)",
            backgroundSize: "200% 100%",
            animation: "skeleton-shimmer 1.4s ease-in-out infinite",
            opacity: 1 - i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      color: "#7d8590",
    }}>
      <p style={{ fontSize: "13px", margin: 0 }}>Failed to load</p>
      <p style={{ fontSize: "11px", margin: 0, color: "#484f58" }}>{message}</p>
      <button onClick={onRetry} style={{
        fontSize: "12px", padding: "4px 12px", background: "transparent",
        border: "1px solid #30363d", borderRadius: "6px",
        color: "#7d8590", cursor: "pointer",
      }}>Retry</button>
    </div>
  );
}
