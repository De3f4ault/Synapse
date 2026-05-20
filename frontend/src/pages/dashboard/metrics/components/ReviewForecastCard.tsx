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
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
            </NeumorphicCard>
        );
    }

    return (
        <NeumorphicCard 
            className="p-5 h-full cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => navigate("/flashcards")}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-muted border border-border rounded-lg flex items-center justify-center text-accent">
                        <Calendar className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Review Forecast</h3>
                </div>
            </div>
            
            {/* Forecast Grid */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Tomorrow</span>
                    <span className="text-sm font-mono text-foreground">{tomorrow} cards</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">This week</span>
                    <span className="text-sm font-mono text-foreground">{thisWeek} cards</span>
                </div>
                
                {/* Overdue Alert */}
                {overdue > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex items-center gap-2 text-warning">
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
