import { Component, ComponentType, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Home, RefreshCcw, Bug } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Error Boundary Level Types
 * - page: Full-screen error for catastrophic failures
 * - module: Section-level error for module failures
 * - component: Inline error for component failures
 */
export type ErrorBoundaryLevel = "page" | "module" | "component";

/**
 * Props for custom fallback components
 */
export interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
  level: ErrorBoundaryLevel;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: unknown[];
  level?: ErrorBoundaryLevel;
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary Component
 *
 * Three-level error boundary system:
 * - **Page Level**: Full-screen error with home + retry actions
 * - **Module Level**: Section error card with retry action
 * - **Component Level**: Inline error message with retry
 *
 * Features:
 * - Automatic reset on resetKeys change
 * - Custom fallback components
 * - Error logging callback
 * - Accessibility support
 * - Production-ready error tracking integration point
 *
 * @example
 * // Page level
 * <ErrorBoundary level="page">
 *   <Dashboard />
 * </ErrorBoundary>
 *
 * // Module level
 * <ErrorBoundary level="module" resetKeys={[userId]}>
 *   <FlashcardList />
 * </ErrorBoundary>
 *
 * // Component level
 * <ErrorBoundary level="component">
 *   <ComplexChart />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    // Store error info in state
    this.setState({ errorInfo });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // TODO: Send to error tracking service (Sentry, etc.)
    // Example: Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Auto-reset when resetKeys change
    if (
      this.state.hasError &&
      this.props.resetKeys &&
      prevProps.resetKeys &&
      !this.areResetKeysEqual(prevProps.resetKeys, this.props.resetKeys)
    ) {
      this.resetError();
    }
  }

  areResetKeysEqual(a: unknown[], b: unknown[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((key, index) => key === b[index]);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            resetError={this.resetError}
            level={this.props.level || "page"}
          />
        );
      }

      // Use default fallback based on level
      const level = this.props.level || "page";
      return this.renderDefaultFallback(level);
    }

    return this.props.children;
  }

  renderDefaultFallback(level: ErrorBoundaryLevel) {
    const { error, errorInfo } = this.state;

    // Page-level error: Full-screen centered
    if (level === "page") {
      return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-background">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertCircle className="h-6 w-6" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                We're sorry, but something unexpected happened. Please try again
                or return to the home page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {process.env.NODE_ENV === "development" && error && (
                <div className="rounded-md bg-muted p-4 text-sm font-mono overflow-auto max-h-48">
                  <p className="text-destructive font-semibold mb-2">
                    {error.name}: {error.message}
                  </p>
                  {errorInfo?.componentStack && (
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/")}
              >
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
              <Button onClick={this.resetError}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    // Module-level error: Section card
    if (level === "module") {
      return (
        <div className={cn("p-4", this.props.className)}>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error loading this section</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-3">
                {error?.message ||
                  "An error occurred while loading this section. Please try again."}
              </p>
              <Button variant="outline" size="sm" onClick={this.resetError}>
                <RefreshCcw className="mr-2 h-3 w-3" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    // Component-level error: Inline message
    return (
      <div
        className={cn(
          "py-2 px-3 rounded-md bg-destructive/10 border border-destructive/20",
          this.props.className,
        )}
      >
        <div className="flex items-start gap-2 text-sm">
          <Bug className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-destructive font-medium">
              {error?.message || "Component error"}
            </p>
            <Button
              variant="link"
              size="sm"
              onClick={this.resetError}
              className="h-auto p-0 text-xs text-destructive hover:text-destructive/80"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Hook to use ErrorBoundary as a function component wrapper
 * For convenience when you don't need class component features
 */
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">,
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
