import React, { useEffect, useState } from "react";
import { Zap } from "lucide-react";

interface QuizTimerProps {
  startTime: number;
  streak: number;
}

/**
 * Timer and streak display
 */
export const QuizTimer: React.FC<QuizTimerProps> = ({ startTime, streak }) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-4">
      <div className="text-xs font-mono text-slate-400">
        {formatTime(elapsedTime)}
      </div>
      <div className="text-xs font-mono text-purple-400 flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded">
        <Zap size={14} fill="currentColor" />
        STREAK: {streak}
      </div>
    </div>
  );
};
