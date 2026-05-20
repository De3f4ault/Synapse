/**
 * AIInsights - AI Analysis Display
 *
 * Shows AI-generated insights for the quiz attempt.
 */

import React from "react";
import { motion } from "framer-motion";
import { BrainCircuit, Loader2, AlertCircle } from "lucide-react";
import type { QuizInsightsResponse } from "@/api/generated";

interface AIInsightsProps {
    insights: QuizInsightsResponse | null | undefined;
    isLoading: boolean;
    error: Error | null;
    onRefetch: () => void;
}

export const AIInsights: React.FC<AIInsightsProps> = ({
    insights,
    isLoading,
    error,
    onRefetch,
}) => {
    if (isLoading) {
        return (
            <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Analyzing performance...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-destructive mb-2">
                    <AlertCircle size={16} />
                    <span className="text-sm font-medium">Failed to load insights</span>
                </div>
                <button
                    onClick={onRefetch}
                    className="text-xs text-destructive hover:text-red-300 underline"
                >
                    Try again
                </button>
            </div>
        );
    }

    if (!insights) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-cyan-950/20 border border-primary/20 rounded-xl p-5 text-left"
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-3 text-primary">
                <BrainCircuit size={18} />
                <h3 className="font-bold text-sm uppercase tracking-wider">
                    AI Insights
                </h3>
            </div>

            {/* Summary */}
            <p className="text-foreground/80 text-sm leading-relaxed mb-4">
                {insights.summary}
            </p>

            {/* Weak Areas */}
            {insights.weak_areas && insights.weak_areas.length > 0 && (
                <div className="mb-4">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Areas to Review
                    </h4>
                    <ul className="space-y-1">
                        {insights.weak_areas.map((area, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-destructive mt-1">•</span>
                                <span>{area}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Recommendations */}
            {insights.recommendations && insights.recommendations.length > 0 && (
                <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Recommendations
                    </h4>
                    <ul className="space-y-1">
                        {insights.recommendations.map((rec, idx) => (
                            <li key={idx} className="text-sm text-primary/80/80 flex items-start gap-2">
                                <span className="text-primary mt-1">→</span>
                                <span>{rec}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </motion.div>
    );
};
