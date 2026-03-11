/**
 * RecentActivity — Activity feed widget.
 *
 * Shows recent user actions (uploaded, modified, favorited)
 * with color-coded action icons and relative timestamps.
 */

import { Upload, Pencil, Star, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  uploaded:  { icon: Upload,   color: "#10B981", label: "Uploaded" },
  modified:  { icon: Pencil,   color: "#F59E0B", label: "Edited" },
  favorited: { icon: Star,     color: "#EC4899", label: "Starred" },
};

interface ActivityItem {
  action: string;
  filename: string;
  file_type: string;
  time: string;
  document_id: number;
}

interface RecentActivityProps {
  data: ActivityItem[];
  isLoading?: boolean;
}

function fmtRelative(time: string): string {
  try {
    return formatDistanceToNow(new Date(time), { addSuffix: true });
  } catch {
    return "—";
  }
}

export function RecentActivity({ data, isLoading }: RecentActivityProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-4 animate-pulse">
        <div className="h-4 w-28 bg-muted/50 rounded mb-4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 py-2.5">
            <div className="size-7 rounded-md bg-muted/50 shrink-0" />
            <div className="space-y-1 flex-1">
              <div className="h-3 w-3/4 bg-muted/30 rounded" />
              <div className="h-2.5 w-1/2 bg-muted/20 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <h3 className="text-[13px] font-semibold text-foreground mb-3">Recent Activity</h3>

      <div className="space-y-0.5">
        {data.map((item, i) => {
          const config = ACTION_CONFIG[item.action] || {
            icon: FileText, color: "#6B7280", label: item.action,
          };
          const Icon = config.icon;

          return (
            <div
              key={`${item.document_id}-${item.action}-${i}`}
              className="flex items-start gap-3 py-2 rounded-lg px-1 hover:bg-muted/20 transition-colors"
            >
              {/* Action icon */}
              <div
                className="size-7 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: `${config.color}15` }}
              >
                <Icon className="size-3.5" style={{ color: config.color }} />
              </div>

              {/* Details */}
              <div className="min-w-0 flex-1">
                <p className="text-[12px] text-foreground truncate">
                  <span className="text-muted-foreground">{config.label}</span>{" "}
                  {item.filename}
                </p>
                <p className="text-[11px] text-muted-foreground">{fmtRelative(item.time)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
