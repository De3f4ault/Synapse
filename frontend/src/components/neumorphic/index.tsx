import React from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

// --- Neumorphic Card ---

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
    default: "nm-card",
    flat: "nm-panel",
    inset: "nm-input p-4",
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

// --- Neumorphic Button ---

interface NeumorphicButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
}

export const NeumorphicButton = React.forwardRef<
  HTMLButtonElement,
  NeumorphicButtonProps
>(({ className, variant = "default", size = "md", ...props }, ref) => {
  const variants = {
    default: "nm-btn",
    primary: "nm-btn nm-btn-primary",
    ghost: "hover:bg-white/5 text-slate-400 hover:text-white transition-colors",
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
      className={cn(variants[variant], sizes[size], "font-medium", className)}
      {...props}
    />
  );
});
NeumorphicButton.displayName = "NeumorphicButton";

// --- Neumorphic Progress ---

interface NeumorphicProgressProps {
  value: number;
  max?: number;
  className?: string;
  color?: "cyan" | "purple" | "emerald" | "blue" | "coral";
  size?: "sm" | "md" | "lg";
}

export const NeumorphicProgress = ({
  value,
  max = 100,
  className,
  color = "cyan",
  size = "md",
}: NeumorphicProgressProps) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const colors = {
    cyan: "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]",
    purple: "bg-purple-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]",
    emerald: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]",
    blue: "bg-blue-500 shadow-[0_0_10px_rgba(0,212,255,0.5)]",
    coral: "bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)]",
  };

  const heights = {
    sm: "h-1",
    md: "h-2",
    lg: "h-4",
  };

  return (
    <div
      className={cn(
        "w-full bg-black/40 rounded-full overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] border border-white/5",
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

// --- Neumorphic Badge ---

interface NeumorphicBadgeProps {
  children: React.ReactNode;
  variant?: "default" | "outline" | "gradient";
  color?: "cyan" | "purple" | "emerald" | "blue" | "coral" | "slate";
  className?: string;
}

export const NeumorphicBadge = ({
  children,
  variant = "default",
  color = "slate",
  className,
}: NeumorphicBadgeProps) => {
  const colorStyles = {
    cyan: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    purple: "text-purple-400 border-purple-500/30 bg-purple-500/10",
    emerald: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    blue: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    coral: "text-rose-400 border-rose-500/30 bg-rose-500/10",
    slate: "text-slate-400 border-slate-500/30 bg-slate-500/10",
  };

  const variants = {
    default: "border shadow-sm",
    outline: "border bg-transparent",
    gradient:
      "border-none bg-gradient-to-r from-white/10 to-transparent text-white",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm",
        colorStyles[color],
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
};

// --- Neumorphic Stats Card ---

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
        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">
          {label}
        </span>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <div>
        <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          {value}
        </div>
        {trend && (
          <div
            className={cn(
              "text-xs mt-1",
              trendUp ? "text-emerald-400" : "text-rose-400",
            )}
          >
            {trend}
          </div>
        )}
      </div>
    </NeumorphicCard>
  );
};
// --- Neumorphic Input ---

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
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Icon className="w-4 h-4" />
        </div>
      )}
      <input
        ref={ref}
        className={cn(
          "w-full h-10 bg-[#0f172a] rounded-xl text-sm text-slate-200 placeholder:text-slate-500 transition-all outline-none",
          "shadow-[inset_-2px_-2px_6px_rgba(255,255,255,0.05),inset_2px_2px_6px_rgba(0,0,0,0.5)]",
          "focus:shadow-[inset_-2px_-2px_6px_rgba(255,255,255,0.02),inset_2px_2px_6px_rgba(0,0,0,0.3),0_0_0_1px_rgba(34,211,238,0.3)]",
          Icon ? "pl-10 pr-4" : "px-4",
          className,
        )}
        {...props}
      />
    </div>
  );
});
NeumorphicInput.displayName = "NeumorphicInput";
