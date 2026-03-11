/**
 * StorageCards — Per-type storage breakdown row.
 *
 * Responsive grid of cards showing Images, Videos, Documents, etc.
 * with icons, total size, file count, and percentage bar.
 */

import { Image, Video, FileText, Archive, Music, Code, File } from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Images: Image,
  Videos: Video,
  Documents: FileText,
  Archives: Archive,
  Audio: Music,
  Code: Code,
  Other: File,
};

interface StorageItem {
  type: string;
  size: number;
  count: number;
  color: string;
}

interface StorageCardsProps {
  data: StorageItem[];
  isLoading?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function StorageCards({ data, isLoading }: StorageCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card p-4 animate-pulse">
            <div className="size-10 rounded-lg bg-muted/50 mb-3" />
            <div className="h-3 w-16 bg-muted/50 rounded mb-1.5" />
            <div className="h-2.5 w-12 bg-muted/30 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  const totalSize = data.reduce((sum, item) => sum + item.size, 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {data.map((item) => {
        const Icon = CATEGORY_ICONS[item.type] || File;
        const pct = totalSize > 0 ? ((item.size / totalSize) * 100).toFixed(1) : "0";

        return (
          <div
            key={item.type}
            className="rounded-xl border border-border/50 bg-card p-4 hover:border-border transition-colors"
          >
            {/* Icon */}
            <div
              className="size-10 rounded-lg flex items-center justify-center mb-3"
              style={{ backgroundColor: `${item.color}15` }}
            >
              <Icon className="size-5" style={{ color: item.color }} />
            </div>

            {/* Details */}
            <p className="text-[13px] font-medium text-foreground">{item.type}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {formatBytes(item.size)} · {item.count} file{item.count !== 1 ? "s" : ""}
            </p>

            {/* Percentage bar */}
            <div className="mt-2.5 h-1 rounded-full bg-muted/50 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{pct}%</p>
          </div>
        );
      })}
    </div>
  );
}
