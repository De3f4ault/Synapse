/**
 * StorageOverview — Right panel storage widget.
 *
 * Multi-color segmented progress bar + category breakdown.
 * Compact widget for the sidebar/right panel.
 */

interface StorageItem {
  type: string;
  size: number;
  count: number;
  color: string;
}

interface StorageOverviewProps {
  data: StorageItem[];
  maxStorage?: number; // bytes, e.g. 15 GB
  isLoading?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function StorageOverview({ data, maxStorage = 15 * 1024 * 1024 * 1024, isLoading }: StorageOverviewProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-4 animate-pulse">
        <div className="h-4 w-28 bg-muted/50 rounded mb-4" />
        <div className="h-2 w-full bg-muted/30 rounded-full mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-muted/50" />
              <div className="h-3 w-20 bg-muted/30 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  const totalUsed = data.reduce((sum, item) => sum + item.size, 0);

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <h3 className="text-[13px] font-semibold text-foreground mb-1">Storage</h3>
      <p className="text-[11px] text-muted-foreground mb-3">
        {formatBytes(totalUsed)} of {formatBytes(maxStorage)} used
      </p>

      {/* Multi-color segmented bar */}
      <div className="h-2 rounded-full bg-muted/30 overflow-hidden flex">
        {data.map((item) => {
          const segPct = (item.size / maxStorage) * 100;
          if (segPct < 0.1) return null;
          return (
            <div
              key={item.type}
              className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-500"
              style={{
                width: `${segPct}%`,
                backgroundColor: item.color,
              }}
              title={`${item.type}: ${formatBytes(item.size)}`}
            />
          );
        })}
      </div>

      {/* Breakdown grid */}
      <div className="mt-4 space-y-2">
        {data.map((item) => (
          <div key={item.type} className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[12px] text-muted-foreground truncate">{item.type}</span>
            </div>
            <span className="text-[12px] text-foreground tabular-nums shrink-0">{formatBytes(item.size)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
