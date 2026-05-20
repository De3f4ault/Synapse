/**
 * LastSessionCard - Shows last study session quality
 * 
 * Answers: "Was my last effort effective?"
 * Data source: /api/v1/analytics/last-session
 * Session boundary: 45-min window from last activity (explicit, not magic)
 */

import React from "react";
import { NeumorphicCard } from "@/components/neumorphic";
import { Zap, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface LastSessionCardProps {
    cardsReviewed: number;
    durationMinutes: number;
    accuracyPercent: number;
    qualityLabel: string;
    hasSession: boolean;
    isLoading?: boolean;
}

export const LastSessionCard: React.FC<LastSessionCardProps> = ({
    cardsReviewed,
    durationMinutes,
    accuracyPercent,
    qualityLabel,
    hasSession,
    isLoading,
}) => {
    if (isLoading) {
        return (
            <NeumorphicCard className="p-5 h-full">
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
            </NeumorphicCard>
        );
    }

    // Determine color based on quality
    const getQualityColor = () => {
        if (accuracyPercent >= 90) return "text-accent-olive";
        if (accuracyPercent >= 70) return "text-primary";
        return "text-warning";
    };

    const getQualityIcon = () => {
        if (accuracyPercent >= 90) return <CheckCircle2 className="w-4 h-4" />;
        if (accuracyPercent >= 70) return <Zap className="w-4 h-4" />;
        return <AlertCircle className="w-4 h-4" />;
    };

    if (!hasSession) {
        return (
            <NeumorphicCard className="p-5 h-full">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-muted border border-border rounded-lg flex items-center justify-center text-muted-foreground">
                        <Zap className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Last Session</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                    No sessions yet. Start reviewing to see your progress!
                </p>
            </NeumorphicCard>
        );
    }

    return (
        <NeumorphicCard className="p-5 h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg bg-muted border border-border rounded-lg flex items-center justify-center ${getQualityColor()}`}>
                        {getQualityIcon()}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Last Session</h3>
                </div>
            </div>
            
            {/* Main Metric */}
            <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-bold font-mono ${getQualityColor()}`}>
                        {accuracyPercent.toFixed(0)}%
                    </span>
                    <span className="text-xs text-muted-foreground">accuracy</span>
                </div>
                
                {/* Details */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{cardsReviewed} cards</span>
                    <span>•</span>
                    <span>{durationMinutes} min</span>
                </div>
                
                {/* Quality Label */}
                <p className={`text-xs font-medium ${getQualityColor()}`}>
                    {qualityLabel}
                </p>
            </div>
        </NeumorphicCard>
    );
};
