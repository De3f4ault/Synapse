import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatusCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    className?: string;
    onClick?: () => void;
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
}) => {
    return (
        <Card
            className={cn(
                "hover:bg-accent/50 transition-colors cursor-pointer",
                className
            )}
            onClick={onClick}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {(subtitle || trendValue) && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        {trend && (
                            <span className={cn(
                                trend === 'up' ? "text-green-500" :
                                    trend === 'down' ? "text-red-500" : "text-yellow-500"
                            )}>
                                {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
                            </span>
                        )}
                        {trendValue && <span className={cn(
                            trend === 'up' ? "text-green-500" :
                                trend === 'down' ? "text-red-500" : "text-yellow-500"
                        )}>{trendValue}</span>}
                        {subtitle}
                    </p>
                )}
            </CardContent>
        </Card>
    );
};
