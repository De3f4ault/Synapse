import React from "react";
import { NeumorphicCard } from "@/components/neumorphic";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatusCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
  onClick?: () => void;
  color?: "cyan" | "purple" | "emerald" | "amber" | "red";
}

export const StatusCard: React.FC<StatusCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  className,
  onClick,
  color = "cyan",
}) => {
  const colorClasses = {
    cyan: "text-cyan-400",
    purple: "text-purple-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
  };

  return (
    <NeumorphicCard
      className={cn(
        "p-6 flex flex-col justify-between hover:bg-white/[0.02] transition-colors cursor-pointer group h-full",
        className,
      )}
      onClick={onClick}
    >
      <div className="flex flex-row items-center justify-between pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 transition-colors">
          {title}
        </span>
        <div
          className={cn(
            "w-8 h-8 rounded-lg nm-inset flex items-center justify-center transition-colors",
            colorClasses[color],
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <div className="text-3xl font-bold text-white mb-1 group-hover:scale-105 transition-transform origin-left">
          {value}
        </div>
        {(subtitle || trendValue) && (
          <div className="text-xs text-slate-500 font-mono flex items-center gap-1">
            {trend && (
              <span
                className={cn(
                  "font-bold",
                  trend === "up"
                    ? "text-emerald-400"
                    : trend === "down"
                      ? "text-red-400"
                      : "text-amber-400",
                )}
              >
                {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
              </span>
            )}
            {trendValue && (
              <span
                className={cn(
                  "font-bold",
                  trend === "up"
                    ? "text-emerald-400"
                    : trend === "down"
                      ? "text-red-400"
                      : "text-amber-400",
                )}
              >
                {trendValue}
              </span>
            )}
            {subtitle}
          </div>
        )}
      </div>
    </NeumorphicCard>
  );
};
