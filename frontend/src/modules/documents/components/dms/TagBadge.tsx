/**
 * TagBadge — Colored tag badge with auto-contrast text
 *
 * Modeled after Paperless-ngx tag rendering with computed text color.
 */

import { cn } from "@/lib/utils";

interface TagBadgeProps {
  name: string;
  color: string; // hex background e.g. "#a6cee3"
  /** If true, show a clickable × button */
  removable?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Compute whether to use white or black text based on background luminance.
 * Uses WCAG relative luminance formula.
 */
function getContrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#1a1a2e" : "#ffffff";
}

export function TagBadge({
  name,
  color,
  removable = false,
  onRemove,
  onClick,
  className,
  size = "sm",
}: TagBadgeProps) {
  const textColor = getContrastText(color);

  return (
    <span
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium transition-all",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        onClick && "cursor-pointer hover:opacity-80 hover:shadow-sm",
        className
      )}
      style={{
        backgroundColor: color,
        color: textColor,
      }}
    >
      <span className="truncate max-w-[120px]">{name}</span>
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 transition-colors"
          aria-label={`Remove tag ${name}`}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5" />
          </svg>
        </button>
      )}
    </span>
  );
}
