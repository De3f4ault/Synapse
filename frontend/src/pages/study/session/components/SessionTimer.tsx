/**
 * SessionTimer - Floating timer display for study sessions
 * 
 * Single Responsibility: Display elapsed time with pause/resume controls
 * 
 * Minimal, unobtrusive timer that floats at the top of the session.
 */

import { Clock, Pause, Play } from 'lucide-react';

interface SessionTimerProps {
  elapsedTime: number;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
}

/**
 * Format milliseconds to MM:SS display
 */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function SessionTimer({ elapsedTime, isPaused, onPause, onResume }: SessionTimerProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 border border-white/10 backdrop-blur-sm">
      <Clock size={14} className="text-slate-500" />
      <span className="font-mono text-sm text-slate-300 w-14 text-center">
        {formatTime(elapsedTime)}
      </span>
      <button
        onClick={isPaused ? onResume : onPause}
        className="p-1 rounded-full hover:bg-white/10 transition-colors"
        aria-label={isPaused ? 'Resume' : 'Pause'}
      >
        {isPaused ? (
          <Play size={12} className="text-cyan-400" fill="currentColor" />
        ) : (
          <Pause size={12} className="text-slate-400" />
        )}
      </button>
    </div>
  );
}
