import { useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  MotionValue,
} from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
  value: number;
  className?: string;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  formatter?: (value: number) => string;
}

/**
 * AnimatedCounter Component
 *
 * Smooth number counting animation from 0 to target value.
 *
 * Features:
 * - Configurable duration and easing
 * - Decimal precision support
 * - Prefix/suffix support (e.g., "$", "%")
 * - Custom formatter function
 * - Re-animates on value change
 * - Accessible (updates aria-live region)
 *
 * @example
 * // Basic counter
 * <AnimatedCounter value={1234} />
 *
 * // Currency
 * <AnimatedCounter value={1234.56} prefix="$" decimals={2} />
 *
 * // Percentage
 * <AnimatedCounter value={87.5} suffix="%" decimals={1} />
 *
 * // Custom formatter
 * <AnimatedCounter
 *   value={1234567}
 *   formatter={(v) => v.toLocaleString()}
 * />
 */
export function AnimatedCounter({
  value,
  className,
  duration = 1,
  decimals = 0,
  prefix = "",
  suffix = "",
  formatter,
}: AnimatedCounterProps) {
  const motionValue = useMotionValue(0);
  const prevValueRef = useRef(0);

  // Transform motion value to rounded display value
  const displayValue = useTransform(motionValue, (latest) => {
    const rounded = latest.toFixed(decimals);
    if (formatter) {
      return formatter(parseFloat(rounded));
    }
    return rounded;
  });

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: "easeOut",
      from: prevValueRef.current,
    });

    prevValueRef.current = value;

    return controls.stop;
  }, [value, duration, motionValue]);

  return (
    <motion.span
      className={cn("tabular-nums", className)}
      aria-live="polite"
      aria-atomic="true"
    >
      {prefix}
      <motion.span>{displayValue}</motion.span>
      {suffix}
    </motion.span>
  );
}

/**
 * useAnimatedCounter Hook
 *
 * Hook version for more control over the animation
 * Returns a MotionValue that can be used with useTransform
 *
 * @example
 * const count = useAnimatedCounter(1234, { duration: 2 });
 * const displayValue = useTransform(count, (v) => Math.round(v).toLocaleString());
 */
export function useAnimatedCounter(
  value: number,
  options: {
    duration?: number;
    from?: number;
  } = {},
): MotionValue<number> {
  const { duration = 1, from = 0 } = options;
  const motionValue = useMotionValue(from);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: "easeOut",
    });

    return controls.stop;
  }, [value, duration, motionValue]);

  return motionValue;
}
