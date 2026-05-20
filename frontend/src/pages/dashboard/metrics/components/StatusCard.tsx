/**
 * StatusCard - KPI metric display with trend indicator
 * 
 * Used for top-level dashboard statistics (due cards, accuracy, streak, time)
 */

import React from "react";
import { NeumorphicCard } from "@/components/neumorphic";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface StatusCardProps {
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

const colorClasses = {
    cyan: "text-primary",
    purple: "text-accent",
    emerald: "text-accent-olive",
    amber: "text-warning",
    red: "text-destructive",
};

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
    return (
        <NeumorphicCard
            className={cn(
                "p-6 flex flex-col justify-between hover:bg-muted/50 transition-colors cursor-pointer group h-full",
                className,
            )}
            onClick={onClick}
        >
            <div className="flex flex-row items-center justify-between pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-muted-foreground transition-colors">
                    {title}
                </span>
                <div
                    className={cn(
                        "w-8 h-8 rounded-lg bg-muted border border-border rounded-lg flex items-center justify-center transition-colors",
                        colorClasses[color],
                    )}
                >
                    <Icon className="h-4 w-4" />
                </div>
            </div>
            <div>
                <div className="text-3xl font-bold text-foreground mb-1 group-hover:scale-105 transition-transform origin-left">
                    {value}
                </div>
                {(subtitle || trendValue) && (
                    <div className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                        {trend && (
                            <span
                                className={cn(
                                    "font-bold",
                                    trend === "up"
                                        ? "text-accent-olive"
                                        : trend === "down"
                                            ? "text-destructive"
                                            : "text-warning",
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
                                        ? "text-accent-olive"
                                        : trend === "down"
                                            ? "text-destructive"
                                            : "text-warning",
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
