/**
 * TodaysProgressCard - Shows today's study progress
 * 
 * Answers: "Did I show up today?"
 * Data source: Learning Ledger (/api/v1/analytics/today)
 */

import React from "react";
import { NeumorphicCard } from "@/components/neumorphic";
import { CheckCircle2, Target, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TodaysProgressCardProps {
    reviewsCompleted: number;
    totalDue: number;
    studyTimeMinutes: number;
    isLoading?: boolean;
}

export const TodaysProgressCard: React.FC<TodaysProgressCardProps> = ({
    reviewsCompleted,
    totalDue,
    studyTimeMinutes,
    isLoading,
}) => {
    const navigate = useNavigate();
    
    const progressPercent = totalDue > 0 
        ? Math.min(100, Math.round((reviewsCompleted / totalDue) * 100))
        : reviewsCompleted > 0 ? 100 : 0;
    
    const isComplete = reviewsCompleted >= totalDue && totalDue > 0;
    
    if (isLoading) {
        return (
            <NeumorphicCard className="p-5 h-full">
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
            </NeumorphicCard>
        );
    }

    return (
        <NeumorphicCard 
            className="p-5 h-full cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => navigate("/flashcards/review")}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg bg-muted border border-border rounded-lg flex items-center justify-center ${
                        isComplete ? "text-accent-olive" : "text-primary"
                    }`}>
                        {isComplete ? (
                            <CheckCircle2 className="w-4 h-4" />
                        ) : (
                            <Target className="w-4 h-4" />
                        )}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Today's Progress</h3>
                </div>
                <span className="text-xs text-muted-foreground">{studyTimeMinutes} min</span>
            </div>
            
            {/* Progress Display */}
            <div className="space-y-3">
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground font-mono">
                        {reviewsCompleted}
                    </span>
                    <span className="text-lg text-muted-foreground">/</span>
                    <span className="text-lg text-muted-foreground font-mono">
                        {totalDue}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">reviews</span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-muted border border-border rounded-lg overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                            isComplete 
                                ? "bg-gradient-to-r from-emerald-500 to-emerald-400" 
                                : "bg-primary"
                        }`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                
                {/* Status Text */}
                <p className="text-xs text-muted-foreground">
                    {isComplete 
                        ? "All caught up! 🎉" 
                        : progressPercent > 0 
                            ? `${progressPercent}% complete`
                            : "Ready to start"
                    }
                </p>
            </div>
        </NeumorphicCard>
    );
};
