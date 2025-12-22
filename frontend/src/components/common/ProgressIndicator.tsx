import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  value: number; // 0-100
  variant?: "linear" | "circular";
  size?: "sm" | "md" | "lg";
  color?: "primary" | "success" | "warning" | "danger";
  showLabel?: boolean;
  label?: string;
  className?: string;
}

/**
 * ProgressIndicator Component
 *
 * Visual progress display for multi-step processes, file uploads, review sessions.
 *
 * Features:
 * - Linear (bar) and circular (ring) variants
 * - Multiple sizes and colors
 * - Smooth animated transitions
 * - Optional label display
 * - Percentage or custom label
 * - Accessible with proper ARIA attributes
 *
 * @example
 * // Linear progress bar
 * <ProgressIndicator value={65} showLabel />
 *
 * // Circular progress ring
 * <ProgressIndicator
 *   value={75}
 *   variant="circular"
 *   size="lg"
 *   label="3/4 complete"
 * />
 *
 * // File upload
 * <ProgressIndicator
 *   value={uploadProgress}
 *   color="success"
 *   label="Uploading..."
 * />
 */
export function ProgressIndicator({
  value,
  variant = "linear",
  size = "md",
  color = "primary",
  showLabel = false,
  label,
  className,
}: ProgressIndicatorProps) {
  // Clamp value between 0 and 100
  const clampedValue = Math.min(100, Math.max(0, value));

  if (variant === "circular") {
    return (
      <CircularProgress
        value={clampedValue}
        size={size}
        color={color}
        showLabel={showLabel}
        label={label}
        className={className}
      />
    );
  }

  return (
    <LinearProgress
      value={clampedValue}
      size={size}
      color={color}
      showLabel={showLabel}
      label={label}
      className={className}
    />
  );
}

/**
 * Linear Progress Bar
 */
function LinearProgress({
  value,
  size,
  color,
  showLabel,
  label,
  className,
}: Omit<ProgressIndicatorProps, "variant">) {
  // Size classes
  const sizeClasses = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  // Color classes
  const colorClasses = {
    primary: "bg-primary",
    success: "bg-green-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
  };

  const displayLabel = label || `${Math.round(value)}%`;

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            {displayLabel}
          </span>
        </div>
      )}
      <div
        className={cn(
          "w-full bg-secondary rounded-full overflow-hidden",
          sizeClasses[size || "md"],
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || "Progress"}
      >
        <motion.div
          className={cn(
            "h-full rounded-full",
            colorClasses[color || "primary"],
          )}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{
            duration: 0.5,
            ease: "easeOut",
          }}
        />
      </div>
    </div>
  );
}

/**
 * Circular Progress Ring
 */
function CircularProgress({
  value,
  size,
  color,
  showLabel,
  label,
  className,
}: Omit<ProgressIndicatorProps, "variant">) {
  // Size mappings
  const sizeMap = {
    sm: { diameter: 48, strokeWidth: 4, fontSize: "text-xs" },
    md: { diameter: 80, strokeWidth: 6, fontSize: "text-sm" },
    lg: { diameter: 120, strokeWidth: 8, fontSize: "text-base" },
  };

  const { diameter, strokeWidth, fontSize } = sizeMap[size || "md"];
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  // Color classes
  const colorClasses = {
    primary: "stroke-primary",
    success: "stroke-green-500",
    warning: "stroke-amber-500",
    danger: "stroke-red-500",
  };

  const displayLabel = label || `${Math.round(value)}%`;

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
    >
      <svg
        width={diameter}
        height={diameter}
        className="transform -rotate-90"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || "Progress"}
      >
        {/* Background circle */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-secondary"
        />
        {/* Progress circle */}
        <motion.circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={colorClasses[color || "primary"]}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{
            duration: 0.5,
            ease: "easeOut",
          }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      {/* Center label */}
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-semibold text-foreground", fontSize)}>
            {displayLabel}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Indeterminate Progress Bar
 * For when progress is unknown (loading state)
 */
export function IndeterminateProgress({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  return (
    <div
      className={cn(
        "w-full bg-secondary rounded-full overflow-hidden",
        sizeClasses[size],
        className,
      )}
      role="progressbar"
      aria-label="Loading"
      aria-busy="true"
    >
      <motion.div
        className="h-full bg-primary rounded-full"
        animate={{
          x: ["-100%", "200%"],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ width: "50%" }}
      />
    </div>
  );
}
