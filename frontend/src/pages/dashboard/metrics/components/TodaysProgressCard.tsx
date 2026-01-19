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
                    <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
                </div>
            </NeumorphicCard>
        );
    }

    return (
        <NeumorphicCard 
            className="p-5 h-full cursor-pointer hover:border-cyan-500/30 transition-colors"
            onClick={() => navigate("/flashcards/review")}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg nm-inset flex items-center justify-center ${
                        isComplete ? "text-emerald-400" : "text-cyan-400"
                    }`}>
                        {isComplete ? (
                            <CheckCircle2 className="w-4 h-4" />
                        ) : (
                            <Target className="w-4 h-4" />
                        )}
                    </div>
                    <h3 className="text-sm font-semibold text-white">Today's Progress</h3>
                </div>
                <span className="text-xs text-slate-500">{studyTimeMinutes} min</span>
            </div>
            
            {/* Progress Display */}
            <div className="space-y-3">
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white font-mono">
                        {reviewsCompleted}
                    </span>
                    <span className="text-lg text-slate-500">/</span>
                    <span className="text-lg text-slate-400 font-mono">
                        {totalDue}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">reviews</span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full nm-inset overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                            isComplete 
                                ? "bg-gradient-to-r from-emerald-500 to-emerald-400" 
                                : "bg-gradient-to-r from-cyan-500 to-cyan-400"
                        }`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                
                {/* Status Text */}
                <p className="text-xs text-slate-400">
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
