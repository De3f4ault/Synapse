import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GradientCardProps {
  children: ReactNode;
  className?: string;
  variant?:
    | "default"
    | "primary"
    | "success"
    | "warning"
    | "danger"
    | "purple"
    | "blue";
  hover?: boolean;
  onClick?: () => void;
}

/**
 * GradientCard Component
 *
 * Card with gradient background and optional hover effects.
 *
 * Features:
 * - Multiple gradient variants
 * - Hover scale and shadow effects
 * - Click handler support
 * - Smooth animations
 * - Responsive design
 *
 * @example
 * <GradientCard variant="primary" hover>
 *   <h3>Premium Feature</h3>
 *   <p>Upgrade to unlock</p>
 * </GradientCard>
 *
 * // Clickable card
 * <GradientCard variant="success" hover onClick={handleClick}>
 *   <div>Action card content</div>
 * </GradientCard>
 */
export function GradientCard({
  children,
  className,
  variant = "default",
  hover = false,
  onClick,
}: GradientCardProps) {
  // Gradient background classes
  const gradientVariants = {
    default:
      "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800",
    primary:
      "bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 dark:from-primary/10 dark:via-accent/10 dark:to-primary/15",
    success:
      "bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950 dark:via-green-950 dark:to-teal-950",
    warning:
      "bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950 dark:via-yellow-950 dark:to-orange-950",
    danger:
      "bg-gradient-to-br from-rose-50 via-red-50 to-pink-50 dark:from-rose-950 dark:via-red-950 dark:to-pink-950",
    purple:
      "bg-gradient-to-br from-accent/5 via-primary/5 to-accent/10 dark:from-accent/10 dark:via-primary/10 dark:to-accent/15",
    blue: "bg-gradient-to-br from-primary/5 via-accent/5 to-warning/5 dark:from-primary/10 dark:via-accent/10 dark:to-warning/10",
  };

  const CardComponent = hover ? motion.div : "div";
  const cardProps = hover
    ? {
        whileHover: { scale: 1.02, y: -2 },
        whileTap: onClick ? { scale: 0.98 } : undefined,
        transition: { duration: 0.2 },
      }
    : {};

  return (
    <CardComponent
      className={cn(
        "relative overflow-hidden rounded-lg border",
        gradientVariants[variant],
        onClick && "cursor-pointer",
        hover && "transition-shadow hover:shadow-lg",
        className,
      )}
      onClick={onClick}
      {...cardProps}
    >
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent dark:from-white/5 pointer-events-none" />

      {/* Content */}
      <div className="relative">{children}</div>
    </CardComponent>
  );
}

/**
 * GradientCardWithBorder Component
 *
 * Card with animated gradient border effect.
 */
export function GradientCardWithBorder({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative group", className)}>
      {/* Animated gradient border */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-accent to-warning rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-gradient-xy" />

      {/* Card content */}
      <Card className="relative bg-background">{children}</Card>
    </div>
  );
}

/**
 * GlassCard Component
 *
 * Card with glassmorphism effect (backdrop blur + transparency).
 */
export function GlassCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-foreground/5 backdrop-blur-lg",
        "dark:border-border dark:bg-foreground/5",
        "shadow-lg",
        className,
      )}
    >
      {children}
    </div>
  );
}
