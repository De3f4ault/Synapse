import { CheckCircle2 } from 'lucide-react';

/**
 * Empty state for queue when no items
 */
export function QueueEmpty() {
    return (
        <div className="text-center py-12 space-y-3">
        <div className="flex justify-center">
        <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        </div>
        <div>
        <h3 className="font-medium text-sm">All caught up!</h3>
        <p className="text-xs text-muted-foreground mt-1">
        No pending items in your focus queue
        </p>
        </div>
        </div>
    );
}
