/**
 * DMSStatsWidget — Dashboard statistics widget
 *
 * Shows key DMS metrics: total documents, inbox count,
 * correspondents, tags, types, storage usage.
 *
 * Wired to GET /api/v1/documents/statistics
 */

import { cn } from "@/lib/utils";
import { GlassCard } from "@/shared/ui";
import {
  FileText,
  Inbox,
  User,
  Tag,
  FolderOpen,
  HardDrive,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";
import { useDocumentStatistics } from "@/api/hooks/useDocumentStatistics";

interface DMSStatsWidgetProps {
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function DMSStatsWidget({ className }: DMSStatsWidgetProps) {
  const { data: stats, isLoading } = useDocumentStatistics();

  if (isLoading || !stats) {
    return (
      <GlassCard className={cn("p-5", className)}>
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      </GlassCard>
    );
  }

  const monthChange = (stats.documents_this_month ?? 0) - (stats.documents_last_month ?? 0);
  const monthTrend = monthChange >= 0 ? "up" : "down";

  const statItems = [
    {
      icon: FileText,
      label: "Total Documents",
      value: (stats.documents_total ?? 0).toLocaleString(),
      iconClass: "text-primary",
    },
    {
      icon: Inbox,
      label: "In Inbox",
      value: (stats.documents_inbox ?? 0).toLocaleString(),
      iconClass: "text-warning",
      highlight: (stats.documents_inbox ?? 0) > 0,
    },
    {
      icon: User,
      label: "Correspondents",
      value: (stats.correspondents_total ?? 0).toLocaleString(),
      iconClass: "text-info",
    },
    {
      icon: Tag,
      label: "Tags",
      value: (stats.tags_total ?? 0).toLocaleString(),
      iconClass: "text-accent",
    },
    {
      icon: FolderOpen,
      label: "Document Types",
      value: (stats.document_types_total ?? 0).toLocaleString(),
      iconClass: "text-accent-olive",
    },
    {
      icon: HardDrive,
      label: "Storage Used",
      value: formatBytes(stats.storage_total_bytes ?? 0),
      iconClass: "text-muted-foreground",
    },
  ];

  return (
    <GlassCard className={cn("p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-foreground tracking-tight">
          Document Statistics
        </h3>
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
            monthTrend === "up"
              ? "bg-accent-olive/10 text-accent-olive/80"
              : "bg-destructive/10 text-red-300"
          )}
        >
          {monthTrend === "up" ? (
            <TrendingUp size={12} />
          ) : (
            <TrendingDown size={12} />
          )}
          {Math.abs(monthChange)} this month
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg bg-foreground/5 border border-border",
                item.highlight && "border-warning/20 bg-warning/[0.03]"
              )}
            >
              <Icon size={18} className={item.iconClass} />
              <div>
                <p className="text-lg font-bold text-foreground leading-tight">
                  {item.value}
                </p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
