import React from "react";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AnimatedCounter } from "@/components/common/AnimatedCounter";
import { cn } from "@/lib/utils";
import GlassCard from "@/components/ui/GlassCard";

export interface StatCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  formatter?: (value: number) => string;
  trend?: {
    value: number;
    label?: string;
    period?: string;
  };
  icon?: LucideIcon;
  iconColor?: string;
  sparkline?: number[];
  variant?: "default" | "compact" | "expanded";
  className?: string;
  onClick?: () => void;
}

function getTrendInfo(trendValue: number) {
  if (trendValue > 0)
    return {
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    };
  if (trendValue < 0)
    return { icon: TrendingDown, color: "text-red-400", bg: "bg-red-500/10" };
  return { icon: Minus, color: "text-slate-400", bg: "bg-slate-500/10" };
}

/**
 * StatCard - "HUD Metric" Style
 */
export function StatCard({
  label,
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  formatter,
  trend,
  icon: Icon,
  iconColor = "text-cyan-400",
  variant: _variant = "default",
  className,
  onClick,
}: StatCardProps) {
  const trendInfo = trend ? getTrendInfo(trend.value) : null;
  const TrendIcon = trendInfo?.icon;

  return (
    <GlassCard
      hover={!!onClick}
      onClick={onClick}
      className={cn("p-4 flex flex-col justify-between h-full", className)}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          {label}
        </span>
        {Icon && <Icon className={cn("w-3 h-3 opacity-70", iconColor)} />}
      </div>

      <div className="flex items-end gap-2">
        <AnimatedCounter
          value={value}
          prefix={prefix}
          suffix={suffix}
          decimals={decimals}
          formatter={formatter}
          className="text-2xl font-bold text-white leading-none font-mono tracking-tight"
        />
      </div>

      {trend && trendInfo && (
        <div className="flex items-center gap-1.5 mt-2">
          <div
            className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold",
              trendInfo.bg,
              trendInfo.color,
            )}
          >
            {TrendIcon && <TrendIcon className="w-2.5 h-2.5" />}
            <span>{Math.abs(trend.value)}%</span>
          </div>
          {trend.label && (
            <span className="text-[9px] text-slate-600 truncate">
              {trend.label}
            </span>
          )}
        </div>
      )}
    </GlassCard>
  );
}

// Wrapper Components (Logic preserved, styling updated)
interface CommonStatProps {
  value: number;
  trend?: any;
  sparkline?: number[];
  className?: string;
  onClick?: () => void;
}

export function TotalReviewsCard({
  value,
  trend,
  className,
  onClick,
}: CommonStatProps) {
  return (
    <StatCard
      label="Total Reviews"
      value={value}
      formatter={(v) => v.toLocaleString()}
      trend={trend}
      icon={TrendingUp}
      iconColor="text-cyan-400"
      className={className}
      onClick={onClick}
    />
  );
}

export function AccuracyCard({
  value,
  trend,
  className,
  onClick,
}: CommonStatProps) {
  return (
    <StatCard
      label="Accuracy"
      value={value}
      suffix="%"
      decimals={1}
      trend={trend}
      icon={TrendingUp}
      iconColor="text-emerald-400"
      className={className}
      onClick={onClick}
    />
  );
}

export function StudyTimeCard({
  value,
  trend,
  className,
  onClick,
}: CommonStatProps) {
  return (
    <StatCard
      label="Study Time"
      value={value / 60}
      suffix="h"
      decimals={1}
      trend={trend}
      icon={TrendingUp}
      iconColor="text-purple-400"
      className={className}
      onClick={onClick}
    />
  );
}

export function StreakCard({
  value,
  trend,
  className,
  onClick,
}: CommonStatProps) {
  return (
    <StatCard
      label="Streak"
      value={value}
      suffix="d"
      trend={trend}
      icon={TrendingUp}
      iconColor="text-amber-400"
      className={className}
      onClick={onClick}
    />
  );
}

export function StatCardGrid({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-4`,
        className,
      )}
    >
      {children}
    </div>
  );
}

export default StatCard;
