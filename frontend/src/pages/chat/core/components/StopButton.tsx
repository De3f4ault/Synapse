/**
 * StopButton — Stop Generation UI Control
 *
 * Shows when streaming is active.
 * Sends WebSocket stop message.
 * Non-blocking, immediate feedback.
 */

import { Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StopButtonProps {
    /** Whether generation is currently streaming */
    isStreaming: boolean;

    /** Callback to send stop signal */
    onStop: () => void;

    /** Optional class name */
    className?: string;
}

export function StopButton({ isStreaming, onStop, className }: StopButtonProps) {
    if (!isStreaming) return null;

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={onStop}
            className={cn(
                'gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300',
                'transition-colors',
                className
            )}
        >
            <Square className="size-3 fill-current" />
            <span>Stop</span>
        </Button>
    );
}
