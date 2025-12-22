import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | null;
  onRetry?: () => void;
  onGoHome?: () => void;
  variant?: "alert" | "card" | "inline";
  showDetails?: boolean;
  className?: string;
}

/**
 * ErrorState Component
 *
 * Reusable error display component for failed queries/mutations.
 *
 * Features:
 * - Multiple display variants (alert, card, inline)
 * - Retry action button
 * - Optional "Go Home" action
 * - Error details display (dev mode)
 * - Customizable title and message
 * - Accessible error announcements
 *
 * @example
 * // Basic error with retry
 * <ErrorState
 *   title="Failed to load decks"
 *   message="Unable to fetch your decks. Please try again."
 *   onRetry={refetch}
 * />
 *
 * // With error object
 * <ErrorState
 *   error={queryError}
 *   onRetry={refetch}
 *   showDetails={isDevelopment}
 * />
 *
 * // Inline variant
 * <ErrorState
 *   variant="inline"
 *   message="Could not load comments"
 *   onRetry={retry}
 * />
 */
export function ErrorState({
  title = "Something went wrong",
  message = "An error occurred. Please try again.",
  error,
  onRetry,
  onGoHome,
  variant = "alert",
  showDetails = process.env.NODE_ENV === "development",
  className,
}: ErrorStateProps) {
  // Extract error message if error object provided
  const errorMessage = error?.message || message;
  const hasActions = onRetry || onGoHome;

  // Inline variant: Minimal error display
  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex items-start gap-2 py-2 px-3 text-sm text-destructive",
          className,
        )}
        role="alert"
        aria-live="assertive"
      >
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p>{errorMessage}</p>
          {onRetry && (
            <Button
              variant="link"
              size="sm"
              onClick={onRetry}
              className="h-auto p-0 text-xs text-destructive hover:text-destructive/80"
            >
              Try again
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Card variant: Centered card with full details
  if (variant === "card") {
    return (
      <div
        className={cn("flex items-center justify-center py-12 px-4", className)}
      >
        <div className="max-w-md w-full text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
          </div>

          {showDetails && error && (
            <div className="rounded-md bg-muted p-3 text-left">
              <p className="text-xs font-mono text-destructive break-all">
                {error.name}: {error.message}
              </p>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer">
                    Stack trace
                  </summary>
                  <pre className="mt-2 text-xs text-muted-foreground overflow-auto max-h-32">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}

          {hasActions && (
            <div className="flex gap-2 justify-center">
              {onGoHome && (
                <Button variant="outline" onClick={onGoHome}>
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
              )}
              {onRetry && (
                <Button onClick={onRetry}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Alert variant (default): Standard alert component
  return (
    <Alert variant="destructive" className={cn(className)} role="alert">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p className="mb-3">{errorMessage}</p>

        {showDetails && error && (
          <div className="rounded-md bg-destructive/10 p-2 mb-3 text-xs font-mono break-all">
            {error.name}: {error.message}
          </div>
        )}

        {hasActions && (
          <div className="flex gap-2">
            {onGoHome && (
              <Button variant="outline" size="sm" onClick={onGoHome}>
                <Home className="mr-2 h-3 w-3" />
                Go Home
              </Button>
            )}
            {onRetry && (
              <Button size="sm" onClick={onRetry}>
                <RefreshCcw className="mr-2 h-3 w-3" />
                Try Again
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
