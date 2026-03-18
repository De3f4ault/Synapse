/**
 * DMSStatsWidget — Dashboard statistics widget
 *
 * Shows key DMS metrics: total documents, inbox count,
 * correspondents, tags, types, storage usage.
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
} from "lucide-react";

interface DMSStatsWidgetProps {
  stats: {
    totalDocuments: number;
    inboxCount: number;
    correspondentCount: number;
    tagCount: number;
    documentTypeCount: number;
    storageUsed: string;
    documentsThisMonth: number;
    documentsLastMonth: number;
  };
  className?: string;
}

export function DMSStatsWidget({ stats, className }: DMSStatsWidgetProps) {
  const monthChange = stats.documentsThisMonth - stats.documentsLastMonth;
  const monthTrend = monthChange >= 0 ? "up" : "down";

  const statItems = [
    {
      icon: FileText,
      label: "Total Documents",
      value: stats.totalDocuments.toLocaleString(),
      iconClass: "text-cyan-400",
    },
    {
      icon: Inbox,
      label: "In Inbox",
      value: stats.inboxCount.toLocaleString(),
      iconClass: "text-amber-400",
      highlight: stats.inboxCount > 0,
    },
    {
      icon: User,
      label: "Correspondents",
      value: stats.correspondentCount.toLocaleString(),
      iconClass: "text-blue-400",
    },
    {
      icon: Tag,
      label: "Tags",
      value: stats.tagCount.toLocaleString(),
      iconClass: "text-purple-400",
    },
    {
      icon: FolderOpen,
      label: "Document Types",
      value: stats.documentTypeCount.toLocaleString(),
      iconClass: "text-emerald-400",
    },
    {
      icon: HardDrive,
      label: "Storage Used",
      value: stats.storageUsed,
      iconClass: "text-slate-400",
    },
  ];

  return (
    <GlassCard className={cn("p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white tracking-tight">
          Document Statistics
        </h3>
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
            monthTrend === "up"
              ? "bg-emerald-500/10 text-emerald-300"
              : "bg-red-500/10 text-red-300"
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
                "flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.03]",
                item.highlight && "border-amber-500/20 bg-amber-500/[0.03]"
              )}
            >
              <Icon size={18} className={item.iconClass} />
              <div>
                <p className="text-lg font-bold text-white leading-tight">
                  {item.value}
                </p>
                <p className="text-[10px] text-slate-500">{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
