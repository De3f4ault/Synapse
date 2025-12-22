/**
 * ReviewTimer Component
 * Display elapsed time in review session
 */

import { Timer } from "lucide-react";
import { formatTime } from "../../hooks/useReviewSession";

interface ReviewTimerProps {
  elapsedSeconds: number;
}

export function ReviewTimer({ elapsedSeconds }: ReviewTimerProps) {
  return (
    <div className="flex items-center gap-2 text-sm font-mono text-slate-400">
      <Timer className="h-4 w-4" />
      <span>{formatTime(elapsedSeconds)}</span>
    </div>
  );
}
