/**
 * ReviewForecastCard - Shows upcoming review forecast
 * 
 * Answers: "What's coming up?"
 * Data source: Flashcard.next_review dates
 */

import React from "react";
import { NeumorphicCard } from "@/components/neumorphic";
import { Calendar, AlertTriangle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ReviewForecastCardProps {
    tomorrow: number;
    thisWeek: number;
    overdue: number;
    isLoading?: boolean;
}

export const ReviewForecastCard: React.FC<ReviewForecastCardProps> = ({
    tomorrow,
    thisWeek,
    overdue,
    isLoading,
}) => {
    const navigate = useNavigate();
    
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
            onClick={() => navigate("/flashcards")}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg nm-inset flex items-center justify-center text-purple-400">
                        <Calendar className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">Review Forecast</h3>
                </div>
            </div>
            
            {/* Forecast Grid */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Tomorrow</span>
                    <span className="text-sm font-mono text-white">{tomorrow} cards</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">This week</span>
                    <span className="text-sm font-mono text-white">{thisWeek} cards</span>
                </div>
                
                {/* Overdue Alert */}
                {overdue > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                        <div className="flex items-center gap-2 text-amber-400">
                            <AlertTriangle className="w-3 h-3" />
                            <span className="text-xs font-medium">
                                {overdue} overdue
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </NeumorphicCard>
    );
};
