/**
 * ClearableBadge — Filter chip with × remove button
 *
 * Used in FilterEditor to display active filters as removable chips.
 */

import { cn } from "@/lib/utils";
import { Cross2Icon } from "@radix-ui/react-icons";

interface ClearableBadgeProps {
  /** The label text */
  label: string;
  /** Optional secondary text (e.g. the filter value) */
  value?: string;
  /** Callback when × is clicked */
  onRemove: () => void;
  /** Optional color accent */
  color?: string;
  className?: string;
}

export function ClearableBadge({
  label,
  value,
  onRemove,
  color,
  className,
}: ClearableBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium",
        "bg-secondary/50 text-secondary-foreground",
        "transition-colors hover:bg-secondary/80",
        className
      )}
      style={
        color
          ? { borderColor: color, borderLeftWidth: 3 }
          : undefined
      }
    >
      <span className="text-muted-foreground">{label}:</span>
      <span className="truncate max-w-[120px] font-semibold">
        {value || "any"}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-sm p-0.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <Cross2Icon className="h-3 w-3" />
      </button>
    </span>
  );
}
