import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface LoadingSpinnerProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "default" | "dots" | "pulse";
  text?: string;
  fullScreen?: boolean;
}

/**
 * LoadingSpinner Component
 *
 * Enhanced loading spinner with:
 * - Multiple size variants (xs, sm, md, lg, xl)
 * - Multiple visual variants (default spinner, dots, pulse)
 * - Optional loading text
 * - Full-screen overlay mode
 * - Smooth animations with Framer Motion
 * - Accessibility support
 *
 * @example
 * // Basic spinner
 * <LoadingSpinner size="md" />
 *
 * // With text
 * <LoadingSpinner text="Loading decks..." />
 *
 * // Full screen overlay
 * <LoadingSpinner fullScreen text="Processing document..." />
 *
 * // Dots variant
 * <LoadingSpinner variant="dots" />
 */
export function LoadingSpinner({
  className,
  size = "md",
  variant = "default",
  text,
  fullScreen = false,
}: LoadingSpinnerProps) {
  // Size mappings
  const sizeClasses = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  const textSizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
  };

  // Render spinner based on variant
  const renderSpinner = () => {
    if (variant === "dots") {
      return <DotsSpinner size={size} />;
    }

    if (variant === "pulse") {
      return <PulseSpinner size={size} />;
    }

    // Default spinner (rotating circle)
    return (
      <Loader2
        className={cn(
          "animate-spin text-primary",
          sizeClasses[size],
          className,
        )}
        aria-hidden="true"
      />
    );
  };

  const content = (
    <div
      className="flex flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
      aria-label={text || "Loading"}
    >
      {renderSpinner()}
      {text && (
        <p
          className={cn(
            "font-medium text-muted-foreground",
            textSizeClasses[size],
          )}
        >
          {text}
        </p>
      )}
      <span className="sr-only">{text || "Loading..."}</span>
    </div>
  );

  // Full-screen overlay mode
  if (fullScreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

/**
 * Dots Spinner Variant
 * Three animated dots that bounce in sequence
 */
function DotsSpinner({ size }: { size: LoadingSpinnerProps["size"] }) {
  const dotSizes = {
    xs: "h-1.5 w-1.5",
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
    xl: "h-5 w-5",
  };

  const dotSize = dotSizes[size || "md"];

  const dotVariants = {
    initial: { y: 0 },
    animate: {
      y: [-8, 0, -8],
      transition: {
        duration: 0.6,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={cn("rounded-full bg-primary", dotSize)}
          variants={dotVariants}
          initial="initial"
          animate="animate"
          transition={{
            delay: index * 0.15,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Pulse Spinner Variant
 * Expanding and fading circle
 */
function PulseSpinner({ size }: { size: LoadingSpinnerProps["size"] }) {
  const pulseSizes = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  const pulseSize = pulseSizes[size || "md"];

  return (
    <div className="relative" aria-hidden="true">
      <motion.div
        className={cn("rounded-full bg-primary", pulseSize)}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.8, 0, 0.8],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className={cn("absolute inset-0 rounded-full bg-primary", pulseSize)}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.6, 0, 0.6],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.3,
        }}
      />
    </div>
  );
}

/**
 * Centered Loading Spinner
 * Convenience wrapper for centered loading states
 */
export function CenteredLoadingSpinner(
  props: Omit<LoadingSpinnerProps, "fullScreen">,
) {
  return (
    <div className="flex items-center justify-center py-12">
      <LoadingSpinner {...props} />
    </div>
  );
}
