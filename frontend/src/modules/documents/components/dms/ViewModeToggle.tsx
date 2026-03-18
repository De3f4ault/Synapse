/**
 * ViewModeToggle — Switch between Table / Small Cards / Large Cards
 *
 * Mirrors Paperless-ngx's display mode selector with visual feedback.
 */

import { cn } from "@/lib/utils";
import { DisplayMode } from "../../core/types/dms";

interface ViewModeToggleProps {
  mode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
  className?: string;
}

const MODES = [
  {
    value: DisplayMode.TABLE,
    label: "Table",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="2" width="14" height="3" rx="0.5" />
        <rect x="1" y="6.5" width="14" height="3" rx="0.5" />
        <rect x="1" y="11" width="14" height="3" rx="0.5" />
      </svg>
    ),
  },
  {
    value: DisplayMode.SMALL_CARDS,
    label: "Small cards",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="6" height="6" rx="1" />
        <rect x="9" y="1" width="6" height="6" rx="1" />
        <rect x="1" y="9" width="6" height="6" rx="1" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    value: DisplayMode.LARGE_CARDS,
    label: "Large cards",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="14" height="6" rx="1" />
        <rect x="1" y="9" width="14" height="6" rx="1" />
      </svg>
    ),
  },
] as const;

export function ViewModeToggle({
  mode,
  onChange,
  className,
}: ViewModeToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border bg-card p-0.5",
        className
      )}
      role="radiogroup"
      aria-label="Display mode"
    >
      {MODES.map(({ value, label, icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={mode === value}
          aria-label={label}
          title={label}
          onClick={() => onChange(value)}
          className={cn(
            "inline-flex items-center justify-center rounded-sm p-1.5 transition-all",
            mode === value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
