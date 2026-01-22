/**
 * RegenerateButton — Regenerate AI Response
 *
 * Shows on assistant messages (not during streaming).
 * Calls REST endpoint to regenerate response.
 */

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RegenerateButtonProps {
    /** Whether regeneration is in progress */
    isLoading?: boolean;

    /** Callback to trigger regeneration */
    onRegenerate: () => void;

    /** Optional class name */
    className?: string;

    /** Compact mode for inline usage */
    compact?: boolean;
}

export function RegenerateButton({
    isLoading = false,
    onRegenerate,
    className,
    compact = false,
}: RegenerateButtonProps) {
    if (compact) {
        return (
            <button
                onClick={onRegenerate}
                disabled={isLoading}
                className={cn(
                    "p-1 rounded hover:bg-white/10 transition-colors text-muted-foreground hover:text-white",
                    isLoading && "opacity-50 cursor-not-allowed",
                    className
                )}
                title="Regenerate response"
            >
                <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
            </button>
        );
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={onRegenerate}
            disabled={isLoading}
            className={cn(
                'gap-1.5 text-muted-foreground hover:text-white',
                className
            )}
        >
            <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
            <span>{isLoading ? 'Regenerating...' : 'Regenerate'}</span>
        </Button>
    );
}
