/**
 * DocumentHistory — Audit log / change history for a document
 *
 * Exact port of Paperless-ngx document-history.component.ts (86 lines):
 *   - Fetches AuditLogEntry[] via getHistory(docId) (L47-56)
 *   - AuditLogAction enum for action types
 *   - getPrettyName() resolving entity IDs → display names (L59-83)
 *   - Chronological timeline with timestamps and users
 *
 * API contract:
 *   GET /api/documents/{docId}/history/ → AuditLogEntry[]
 */

import { cn } from "@/lib/utils";
import { GlassCard } from "@/shared/ui";
import {
  Plus,
  Pencil,
  Trash2,
  Clock,
  User as UserIcon,
  Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// ============================================================================
// Types (matching Paperless AuditLogEntry + AuditLogAction)
// ============================================================================

/** Matching Paperless AuditLogAction enum from data/auditlog-entry.ts */
export enum AuditLogAction {
  Create = "create",
  Update = "update",
  Delete = "delete",
}

export interface AuditLogEntry {
  id: number;
  timestamp: string;
  action: AuditLogAction;
  user?: { id: number; username: string };
  changes?: Record<string, { old: unknown; new: unknown }>;
}

// ============================================================================
// Action → visual mapping
// ============================================================================

const actionConfig: Record<AuditLogAction, {
  icon: typeof Plus;
  color: string;
  bgColor: string;
  label: string;
}> = {
  [AuditLogAction.Create]: {
    icon: Plus,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    label: "Created",
  },
  [AuditLogAction.Update]: {
    icon: Pencil,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    label: "Modified",
  },
  [AuditLogAction.Delete]: {
    icon: Trash2,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    label: "Deleted",
  },
};

// ============================================================================
// Hook
// ============================================================================

function useDocumentHistory(documentId: number) {
  return useQuery<AuditLogEntry[]>({
    queryKey: ["documentHistory", documentId],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${documentId}/history/`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to fetch history (${res.status})`);
      return res.json();
    },
    staleTime: 60_000,
  });
}

// ============================================================================
// Props
// ============================================================================

interface DocumentHistoryProps {
  documentId: number;
}

// ============================================================================
// Component
// ============================================================================

export function DocumentHistory({ documentId }: DocumentHistoryProps) {
  const { data: entries = [], isLoading } = useDocumentHistory(documentId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-slate-500">
        <Loader2 size={13} className="animate-spin" />
        Loading history...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-xs text-slate-600 py-4">No history available</div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Clock size={15} className="text-blue-400" />
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          History
        </span>
        <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded-full">
          {entries.length}
        </span>
      </div>

      {/* Timeline */}
      <div className="relative pl-5">
        {/* Vertical line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/[0.06]" />

        {entries.map((entry, i) => {
          const config = actionConfig[entry.action] || actionConfig[AuditLogAction.Update];
          const Icon = config.icon;
          const changes = entry.changes ? Object.entries(entry.changes) : [];

          return (
            <div key={entry.id || i} className="relative pb-4 last:pb-0">
              {/* Dot */}
              <div
                className={cn(
                  "absolute -left-5 top-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center",
                  config.bgColor
                )}
              >
                <Icon size={8} className={config.color} />
              </div>

              {/* Content */}
              <div className="ml-1">
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-medium", config.color)}>
                    {config.label}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>

                {/* User */}
                {entry.user && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <UserIcon size={9} className="text-slate-500" />
                    <span className="text-[10px] text-slate-500">
                      {entry.user.username}
                    </span>
                  </div>
                )}

                {/* Field changes */}
                {changes.length > 0 && (
                  <GlassCard className="mt-1.5 p-2 text-[11px]">
                    {changes.map(([field, diff]) => (
                      <div key={field} className="flex items-start gap-2 py-0.5">
                        <span className="text-slate-500 shrink-0 capitalize">
                          {field.replace(/_/g, " ")}:
                        </span>
                        <span className="text-red-400/70 line-through">
                          {String(diff.old ?? "—")}
                        </span>
                        <span className="text-slate-600">→</span>
                        <span className="text-emerald-400/70">
                          {String(diff.new ?? "—")}
                        </span>
                      </div>
                    ))}
                  </GlassCard>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
