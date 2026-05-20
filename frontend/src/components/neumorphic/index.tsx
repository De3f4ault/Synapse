import React from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

/**
 * Warm Primitive Components
 * Replaces Neumorphic design system with warm surface tokens.
 *
 * Naming preserved for backwards compatibility.
 */

// --- Warm Card (was NeumorphicCard) ---

interface NeumorphicCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "flat" | "inset";
  onClick?: () => void;
}

export const NeumorphicCard = React.forwardRef<
  HTMLDivElement,
  NeumorphicCardProps
>(({ children, className, variant = "default", onClick, ...props }, ref) => {
  const variants = {
    default: "bg-card border border-border rounded-lg",
    flat: "bg-card/50 border border-border rounded-lg",
    inset: "bg-background border border-border rounded-lg p-4",
  };

  return (
    <motion.div
      ref={ref}
      className={cn(variants[variant], "relative overflow-hidden", className)}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.div>
  );
});
NeumorphicCard.displayName = "NeumorphicCard";

// --- Warm Button (was NeumorphicButton) ---

interface NeumorphicButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
}

export const NeumorphicButton = React.forwardRef<
  HTMLButtonElement,
  NeumorphicButtonProps
>(({ className, variant = "default", size = "md", ...props }, ref) => {
  const variants = {
    default:
      "bg-secondary text-secondary-foreground border border-border rounded-lg shadow-ring hover:shadow-ring-hover hover:bg-secondary/80 active:scale-[0.98] transition-all duration-200 ease-out",
    primary:
      "bg-primary text-primary-foreground rounded-lg shadow-ring-brand hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 ease-out",
    ghost:
      "text-muted-foreground hover:bg-accent/10 hover:text-foreground transition-colors duration-200 ease-out",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 py-2",
    lg: "h-12 px-8 text-lg",
    icon: "h-10 w-10 p-2 flex items-center justify-center",
  };

  return (
    <button
      ref={ref}
      className={cn(variants[variant], sizes[size], "font-medium cursor-pointer", className)}
      {...props}
    />
  );
});
NeumorphicButton.displayName = "NeumorphicButton";

// --- Warm Progress (was NeumorphicProgress) ---

interface NeumorphicProgressProps {
  value: number;
  max?: number;
  className?: string;
  color?: "brand" | "olive" | "mist" | "coral" | "amber";
  size?: "sm" | "md" | "lg";
}

export const NeumorphicProgress = ({
  value,
  max = 100,
  className,
  color = "brand",
  size = "md",
}: NeumorphicProgressProps) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const colors = {
    brand: "bg-terracotta",
    olive: "bg-accent-olive",
    mist: "bg-accent-mist",
    coral: "bg-accent-coral",
    amber: "bg-warning",
  };

  const heights = {
    sm: "h-1",
    md: "h-2",
    lg: "h-4",
  };

  return (
    <div
      className={cn(
        "w-full bg-muted rounded-full overflow-hidden border border-border",
        heights[size],
        className,
      )}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={cn("h-full rounded-full", colors[color])}
      />
    </div>
  );
};

// --- Warm Badge (was NeumorphicBadge) ---

interface NeumorphicBadgeProps {
  children: React.ReactNode;
  variant?: "default" | "outline" | "muted";
  color?: "brand" | "olive" | "mist" | "coral" | "amber" | "neutral";
  className?: string;
}

export const NeumorphicBadge = ({
  children,
  variant = "default",
  color = "neutral",
  className,
}: NeumorphicBadgeProps) => {
  const colorStyles = {
    brand: "text-terracotta border-terracotta/30 bg-terracotta/10",
    olive: "text-accent-olive border-accent-olive/30 bg-accent-olive/10",
    mist: "text-accent-mist border-accent-mist/30 bg-accent-mist/10",
    coral: "text-accent-coral border-accent-coral/30 bg-accent-coral/10",
    amber: "text-warning border-warning/30 bg-warning/10",
    neutral: "text-muted-foreground border-border bg-muted/50",
  };

  const variants = {
    default: "border",
    outline: "border bg-transparent",
    muted: "border-none bg-muted text-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        colorStyles[color],
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
};

// --- Warm Stats Card (was NeumorphicStats) ---

interface NeumorphicStatsProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export const NeumorphicStats = ({
  label,
  value,
  icon,
  trend,
  trendUp,
  className,
}: NeumorphicStatsProps) => {
  return (
    <NeumorphicCard
      className={cn("p-4 flex flex-col justify-between h-full", className)}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
          {label}
        </span>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div>
        <div className="text-2xl font-serif font-medium text-foreground">
          {value}
        </div>
        {trend && (
          <div
            className={cn(
              "text-xs mt-1",
              trendUp ? "text-accent-olive" : "text-accent-coral",
            )}
          >
            {trend}
          </div>
        )}
      </div>
    </NeumorphicCard>
  );
};

// --- Warm Input (was NeumorphicInput) ---

interface NeumorphicInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ElementType;
  className?: string;
}

export const NeumorphicInput = React.forwardRef<
  HTMLInputElement,
  NeumorphicInputProps
>(({ className, icon: Icon, ...props }, ref) => {
  return (
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Icon className="w-4 h-4" />
        </div>
      )}
      <input
        ref={ref}
        className={cn(
          "w-full h-10 bg-card rounded-lg text-sm text-foreground placeholder:text-muted-foreground",
          "border border-border transition-all duration-200 ease-out outline-none",
          "focus:border-[#3898ec] focus:ring-2 focus:ring-[#3898ec]/20",
          Icon ? "pl-10 pr-4" : "px-4",
          className,
        )}
        {...props}
      />
    </div>
  );
});
NeumorphicInput.displayName = "NeumorphicInput";
