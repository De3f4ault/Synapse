import { ReactNode, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface RetryBoundaryProps {
    children: ReactNode;
    onRetry?: () => void | Promise<void>;
    maxRetries?: number;
    retryDelay?: number;
    autoRetry?: boolean;
    fallback?: ReactNode;
    className?: string;
}

/**
 * RetryBoundary Component
 *
 * Wrapper for network requests with automatic retry logic.
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Configurable max retry attempts
 * - Manual retry button
 * - Shows retry attempts remaining
 * - Loading state during retry
 * - Auto-retry or manual mode
 *
 * Use Case: Wrap sections that fetch critical data and may fail due to network issues.
 *
 * @example
 * <RetryBoundary maxRetries={3} autoRetry>
 *   <CriticalDataComponent />
 * </RetryBoundary>
 *
 * // With custom retry handler
 * <RetryBoundary
 *   maxRetries={5}
 *   onRetry={async () => await refetch()}
 * >
 *   <DataGrid />
 * </RetryBoundary>
 */
export function RetryBoundary({
    children,
    onRetry,
    maxRetries = 3,
    retryDelay = 1000,
    autoRetry = false,
    fallback,
    className,
}: RetryBoundaryProps) {
    const [retryCount, setRetryCount] = useState(0);
    const [isRetrying, setIsRetrying] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Auto-retry with exponential backoff
    useEffect(() => {
        if (autoRetry && error && retryCount < maxRetries) {
            const delay = retryDelay * Math.pow(2, retryCount); // Exponential backoff
            const timeoutId = setTimeout(() => {
                handleRetry();
            }, delay);

            return () => clearTimeout(timeoutId);
        }
    }, [error, retryCount, autoRetry, maxRetries, retryDelay]);

    const handleRetry = async () => {
        if (retryCount >= maxRetries) {
            return;
        }

        setIsRetrying(true);
        setError(null);

        try {
            if (onRetry) {
                await onRetry();
            }
            setRetryCount(0); // Reset on success
        } catch (err) {
            setError(err as Error);
            setRetryCount((prev) => prev + 1);
        } finally {
            setIsRetrying(false);
        }
    };

    const remainingRetries = maxRetries - retryCount;

    // Show error state if max retries reached
    if (error && retryCount >= maxRetries) {
        if (fallback) {
            return <>{fallback}</>;
        }

        return (
            <div className={cn("p-4", className)}>
            <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load</AlertTitle>
            <AlertDescription>
            <p className="mb-3">
            {error.message ||
                "Unable to load content after multiple attempts."}
                </p>
                <Button
                variant="outline"
                size="sm"
                onClick={() => {
                    setRetryCount(0);
                    setError(null);
                    handleRetry();
                }}
                >
                <RefreshCcw className="mr-2 h-3 w-3" />
                Try Again
                </Button>
                </AlertDescription>
                </Alert>
                </div>
        );
    }

    // Show retrying state
    if (isRetrying) {
        return (
            <div className={cn("p-4", className)}>
            <Alert>
            <RefreshCcw className="h-4 w-4 animate-spin" />
            <AlertTitle>Retrying...</AlertTitle>
            <AlertDescription>
            Attempting to reconnect. {remainingRetries} attempts remaining.
            </AlertDescription>
            </Alert>
            </div>
        );
    }

    // Show error with retry button (manual mode or auto-retry in progress)
    if (error && retryCount < maxRetries && !autoRetry) {
        return (
            <div className={cn("p-4", className)}>
            <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>
            <p className="mb-3">
            {error.message || "Failed to load content."}
            </p>
            <div className="flex items-center gap-3">
            <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying}
            >
            <RefreshCcw
            className={cn(
                "mr-2 h-3 w-3",
                isRetrying && "animate-spin"
            )}
            />
            Retry
            </Button>
            <span className="text-xs text-muted-foreground">
            {remainingRetries} attempts remaining
            </span>
            </div>
            </AlertDescription>
            </Alert>
            </div>
        );
    }

    return <>{children}</>;
}

/**
 * Hook version for programmatic retry logic
 *
 * @example
 * const { retry, isRetrying, retryCount, canRetry } = useRetry({
 *   maxRetries: 3,
 *   onRetry: async () => await fetchData(),
 * });
 */
export function useRetry({
    maxRetries = 3,
    retryDelay = 1000,
    onRetry,
}: {
    maxRetries?: number;
    retryDelay?: number;
    onRetry: () => void | Promise<void>;
}) {
    const [retryCount, setRetryCount] = useState(0);
    const [isRetrying, setIsRetrying] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const retry = async () => {
        if (retryCount >= maxRetries) {
            return;
        }

        setIsRetrying(true);
        setError(null);

        // Exponential backoff delay
        if (retryCount > 0) {
            const delay = retryDelay * Math.pow(2, retryCount - 1);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }

        try {
            await onRetry();
            setRetryCount(0); // Reset on success
        } catch (err) {
            setError(err as Error);
            setRetryCount((prev) => prev + 1);
        } finally {
            setIsRetrying(false);
        }
    };

    const reset = () => {
        setRetryCount(0);
        setError(null);
        setIsRetrying(false);
    };

    return {
        retry,
        reset,
        isRetrying,
        retryCount,
        canRetry: retryCount < maxRetries,
        remainingRetries: maxRetries - retryCount,
        error,
    };
}
