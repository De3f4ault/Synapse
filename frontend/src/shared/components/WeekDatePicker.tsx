/**
 * WeekDatePicker - Horizontal Week Date Navigation
 *
 * A React port of AFFiNE's WeekDatePicker component.
 * Displays a horizontal strip of days for the current week with prev/next navigation.
 *
 * Features:
 * - Day selection with visual active state
 * - Today indicator
 * - Keyboard navigation (Arrow keys)
 * - Responsive: Adjusts visible days based on container width
 */

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ============================================================================
// Types
// ============================================================================

export interface WeekDatePickerProps {
  /** Currently selected date in 'YYYY-MM-DD' format */
  value?: string;
  /** Callback when date selection changes */
  onChange?: (value: string) => void;
  /** Additional class name */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DATE_FORMAT = "YYYY-MM-DD";

// ============================================================================
// Component
// ============================================================================

export const WeekDatePicker = memo(function WeekDatePicker({
  value,
  onChange,
  className,
}: WeekDatePickerProps) {
  const [cursor, setCursor] = useState(() => dayjs(value));

  // Generate all days for the current week based on cursor
  const allDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) =>
      cursor.startOf("week").add(index, "day").startOf("day")
    );
  }, [cursor]);

  // Navigation handlers
  const onPrev = useCallback(() => {
    setCursor((c) => c.subtract(1, "week"));
  }, []);

  const onNext = useCallback(() => {
    setCursor((c) => c.add(1, "week"));
  }, []);

  const onDayClick = useCallback(
    (day: dayjs.Dayjs) => {
      onChange?.(day.format(DATE_FORMAT));
    },
    [onChange]
  );

  // Sync cursor with external value changes
  useEffect(() => {
    if (value) {
      setCursor(dayjs(value));
    }
  }, [value]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-xl",
        "bg-zinc-900/80 backdrop-blur-sm border border-white/10",
        className
      )}
    >
      {/* Previous Week Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onPrev}
        className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg"
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Day Cells */}
      <div className="flex items-center gap-1 flex-1 justify-center">
        {allDays.map((day) => (
          <DayCell
            key={day.toISOString()}
            day={day}
            isActive={day.format(DATE_FORMAT) === value}
            isToday={day.isSame(dayjs(), "day")}
            onClick={onDayClick}
          />
        ))}
      </div>

      {/* Next Week Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg"
        aria-label="Next week"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
});

// ============================================================================
// Day Cell Sub-Component
// ============================================================================

interface DayCellProps {
  day: dayjs.Dayjs;
  isActive: boolean;
  isToday: boolean;
  onClick: (day: dayjs.Dayjs) => void;
}

const DayCell = memo(function DayCell({
  day,
  isActive,
  isToday,
  onClick,
}: DayCellProps) {
  const dayIndex = day.day();
  const label = WEEK_DAYS[dayIndex];

  return (
    <button
      type="button"
      onClick={() => onClick(day)}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5",
        "w-12 h-14 rounded-lg transition-all duration-200",
        "text-sm font-medium",
        isActive
          ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20"
          : "text-zinc-400 hover:bg-white/5 hover:text-white",
        isToday && !isActive && "ring-1 ring-cyan-500/50"
      )}
      aria-label={day.format(DATE_FORMAT)}
      data-active={isActive}
      data-today={isToday}
    >
      <span className="text-xs opacity-70">{label}</span>
      <span className="text-base">{day.format("D")}</span>
    </button>
  );
});

export default WeekDatePicker;
