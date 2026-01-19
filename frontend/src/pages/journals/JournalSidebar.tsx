/**
 * JournalSidebar - Right-side Calendar Panel for Journals
 *
 * AFFiNE-style sidebar with:
 * - Full month calendar widget
 * - "Set a Template for the Journal" section
 * - Activity summary (Created/Updated counts)
 */

import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar, BookTemplate } from "lucide-react";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ============================================================================
// Types
// ============================================================================

export interface JournalSidebarProps {
  /** Currently selected date (YYYY-MM-DD) */
  selectedDate: string;
  /** Callback when a date is selected */
  onDateSelect: (date: string) => void;
  /** Whether the sidebar is open */
  isOpen: boolean;
  /** Callback to close sidebar */
  onClose: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const DATE_FORMAT = "YYYY-MM-DD";
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// ============================================================================
// Component
// ============================================================================

export function JournalSidebar({
  selectedDate,
  onDateSelect,
  isOpen,
}: JournalSidebarProps) {
  const [viewMonth, setViewMonth] = useState(() => dayjs(selectedDate));

  // Generate calendar grid for current view month
  const calendarDays = useMemo(() => {
    const startOfMonth = viewMonth.startOf("month");
    const endOfMonth = viewMonth.endOf("month");
    const startDay = startOfMonth.day(); // 0-6 (Sun-Sat)
    const daysInMonth = endOfMonth.date();

    const days: Array<{ date: dayjs.Dayjs; isCurrentMonth: boolean }> = [];

    // Previous month padding
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        date: startOfMonth.subtract(i + 1, "day"),
        isCurrentMonth: false,
      });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: viewMonth.date(i),
        isCurrentMonth: true,
      });
    }

    // Next month padding (fill to 6 rows = 42 cells)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: endOfMonth.add(i, "day"),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [viewMonth]);

  const goToPrevMonth = useCallback(() => {
    setViewMonth((m) => m.subtract(1, "month"));
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewMonth((m) => m.add(1, "month"));
  }, []);

  const goToToday = useCallback(() => {
    const today = dayjs();
    setViewMonth(today);
    onDateSelect(today.format(DATE_FORMAT));
  }, [onDateSelect]);

  const handleDayClick = useCallback(
    (date: dayjs.Dayjs) => {
      onDateSelect(date.format(DATE_FORMAT));
    },
    [onDateSelect]
  );

  if (!isOpen) return null;

  const today = dayjs().format(DATE_FORMAT);

  return (
    <div
      className={cn(
        "fixed top-4 right-4 bottom-4 w-72 z-40",
        "bg-zinc-950/95 backdrop-blur-xl",
        "border border-white/10 rounded-2xl shadow-2xl",
        "flex flex-col overflow-hidden"
      )}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-cyan-400" />
          <span className="font-medium text-white text-sm">Calendar</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={goToToday}
          className="text-xs text-cyan-400 hover:bg-cyan-500/10 h-7 px-2"
        >
          TODAY
        </Button>
      </div>

      {/* Month Navigation */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2">
        <button
          type="button"
          onClick={goToPrevMonth}
          className="p-1 rounded hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-white">
          {viewMonth.format("MMM YYYY")}
        </span>
        <button
          type="button"
          onClick={goToNextMonth}
          className="p-1 rounded hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="shrink-0 grid grid-cols-7 gap-1 px-3 pb-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] font-medium text-zinc-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="shrink-0 grid grid-cols-7 gap-1 px-3 pb-4">
        {calendarDays.map(({ date, isCurrentMonth }, idx) => {
          const dateStr = date.format(DATE_FORMAT);
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === today;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleDayClick(date)}
              className={cn(
                "h-7 w-7 rounded text-xs font-medium transition-all",
                isCurrentMonth ? "text-zinc-300" : "text-zinc-600",
                isSelected && "bg-cyan-500 text-white",
                isToday && !isSelected && "ring-1 ring-cyan-500/50 text-cyan-400",
                !isSelected && "hover:bg-white/5"
              )}
            >
              {date.date()}
            </button>
          );
        })}
      </div>

      {/* Template Section */}
      <div className="shrink-0 mx-3 p-3 rounded-lg border border-white/5 bg-zinc-900/50">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-zinc-800">
            <BookTemplate className="h-5 w-5 text-zinc-400" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-white mb-1">
              Set a Template for the Journal
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 h-7"
            >
              Select
            </Button>
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="flex-1" />
      <div className="shrink-0 px-4 py-3 border-t border-white/5">
        <div className="flex gap-3 text-xs">
          <button className="flex-1 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-400 hover:text-white transition-colors">
            Created 1
          </button>
          <button className="flex-1 py-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors">
            Updated 2
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
          <Calendar className="h-3 w-3" />
          <span>{dayjs(selectedDate).format("MMM D, YYYY")}</span>
        </div>
      </div>
    </div>
  );
}

export default JournalSidebar;
