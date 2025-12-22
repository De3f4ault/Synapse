import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

/**
 * Review Timer Component
 * Displays elapsed time for current card and total session
 */

interface ReviewTimerProps {
  sessionStartTime: number | null;
  cardStartTime: number | null;
}

export function ReviewTimer({
  sessionStartTime,
  cardStartTime,
}: ReviewTimerProps) {
  const [sessionTime, setSessionTime] = useState(0);
  const [cardTime, setCardTime] = useState(0);

  useEffect(() => {
    if (!sessionStartTime) return;

    const interval = setInterval(() => {
      setSessionTime(Math.floor((Date.now() - sessionStartTime) / 1000));

      if (cardStartTime) {
        setCardTime(Math.floor((Date.now() - cardStartTime) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStartTime, cardStartTime]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-6 text-sm">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-muted-foreground">Session</p>
          <p className="font-mono font-medium">{formatTime(sessionTime)}</p>
        </div>
      </div>

      <div className="h-8 w-px bg-border" />

      <div>
        <p className="text-muted-foreground">Card</p>
        <p className="font-mono font-medium">{formatTime(cardTime)}</p>
      </div>
    </div>
  );
}
