import { Clock, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTimeRemaining } from '../../utils/sessionScheduler';

interface SessionTimerProps {
    elapsedTime: number;
    isPaused: boolean;
    onPause: () => void;
    onResume: () => void;
}

export function SessionTimer({ elapsedTime, isPaused, onPause, onResume }: SessionTimerProps) {
    return (
        <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-lg font-medium">
        {formatTimeRemaining(elapsedTime)}
        </span>
        </div>
        <Button
        variant="outline"
        size="sm"
        onClick={isPaused ? onResume : onPause}
        >
        {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>
        </div>
    );
}
