/**
 * PriorityActions - "What Matters Now" section
 *
 * Displays top 3 recommended actions from GIE.
 * This is the conscience of the Study Hub.
 */

import { motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";
import { ActionCard } from "./ActionCard";
import { useIntelligence } from "../../hooks/useIntelligence";
import type { PlatformAction, ConceptState } from "../../hooks/useIntelligence";

interface PriorityActionsProps {
    onExecuteAction?: (action: PlatformAction) => void;
    limit?: number;
}

export function PriorityActions({ onExecuteAction, limit = 3 }: PriorityActionsProps) {
    const { data, isLoading, error } = useIntelligence(limit);

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8 text-slate-500">
                <Loader2 size={20} className="animate-spin mr-2" />
                <span className="text-sm">Analyzing your learning state...</span>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex items-center justify-center py-8 text-slate-500">
                <AlertCircle size={20} className="mr-2" />
                <span className="text-sm">Could not load recommendations</span>
            </div>
        );
    }

    // No actions
    if (!data?.recommended_actions?.length) {
        return (
            <div className="text-center py-8">
                <div className="text-4xl mb-2">✨</div>
                <p className="text-slate-400 text-sm">
                    You're all caught up! No urgent actions right now.
                </p>
            </div>
        );
    }

    // Find matching concept for each action (for additional context)
    const findConceptForAction = (action: PlatformAction): ConceptState | undefined => {
        const allConcepts = [
            ...(data.weak_concepts || []),
            ...(data.fragile_concepts || []),
            ...(data.high_roi_concepts || []),
        ];
        return allConcepts.find(c => c.concept_id === String(action.target.id));
    };

    const handleExecute = (action: PlatformAction) => {
        if (onExecuteAction) {
            onExecuteAction(action);
        } else {
            // Default: navigate to the target
            console.log("Execute action:", action);
            // TODO: Wire to platform executeCapability
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
        >
            {/* Section Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        What Matters Now
                    </h3>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                        {data.recommended_actions.length} priority action{data.recommended_actions.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.recommended_actions.slice(0, limit).map((action, index) => (
                    <motion.div
                        key={`${action.type}-${action.target.id}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <ActionCard
                            action={action}
                            concept={findConceptForAction(action)}
                            onExecute={() => handleExecute(action)}
                        />
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
