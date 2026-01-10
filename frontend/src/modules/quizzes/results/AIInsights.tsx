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
            <div className="bg-[#0c0c12] border border-white/[0.06] rounded-xl p-4 flex items-center justify-center gap-2 text-slate-400">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Analyzing performance...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                    <AlertCircle size={16} />
                    <span className="text-sm font-medium">Failed to load insights</span>
                </div>
                <button
                    onClick={onRefetch}
                    className="text-xs text-red-400 hover:text-red-300 underline"
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
            className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-5 text-left"
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-3 text-cyan-400">
                <BrainCircuit size={18} />
                <h3 className="font-bold text-sm uppercase tracking-wider">
                    AI Insights
                </h3>
            </div>

            {/* Summary */}
            <p className="text-slate-300 text-sm leading-relaxed mb-4">
                {insights.summary}
            </p>

            {/* Weak Areas */}
            {insights.weak_areas && insights.weak_areas.length > 0 && (
                <div className="mb-4">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Areas to Review
                    </h4>
                    <ul className="space-y-1">
                        {insights.weak_areas.map((area, idx) => (
                            <li key={idx} className="text-sm text-slate-400 flex items-start gap-2">
                                <span className="text-red-400 mt-1">•</span>
                                <span>{area}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Recommendations */}
            {insights.recommendations && insights.recommendations.length > 0 && (
                <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Recommendations
                    </h4>
                    <ul className="space-y-1">
                        {insights.recommendations.map((rec, idx) => (
                            <li key={idx} className="text-sm text-cyan-300/80 flex items-start gap-2">
                                <span className="text-cyan-400 mt-1">→</span>
                                <span>{rec}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </motion.div>
    );
};
