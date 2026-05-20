/**
 * ActionCard - Single recommended action from GIE
 *
 * Displays:
 * - Action type (verb)
 * - Target concept
 * - Reason (evidence-backed)
 * - Execute button
 */

import { motion } from "framer-motion";
import { Play, Brain, Zap, BookOpen, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlatformAction, ConceptState } from "../../hooks/useIntelligence";

interface ActionCardProps {
    action: PlatformAction;
    concept?: ConceptState;
    onExecute: () => void;
    className?: string;
}

const ACTION_CONFIG: Record<string, {
    icon: typeof Play;
    label: string;
    color: string;
    bgColor: string;
}> = {
    REINFORCE_GRAPH: {
        icon: Brain,
        label: "Review Flashcards",
        color: "text-destructive",
        bgColor: "bg-destructive/10 border-destructive/20",
    },
    GENERATE_FLASHCARDS: {
        icon: Zap,
        label: "Generate Flashcards",
        color: "text-warning",
        bgColor: "bg-warning/10 border-warning/20",
    },
    GENERATE_QUIZ: {
        icon: BookOpen,
        label: "Generate Quiz",
        color: "text-accent",
        bgColor: "bg-accent/10 border-accent/20",
    },
};

export function ActionCard({ action, concept, onExecute, className }: ActionCardProps) {
    const config = ACTION_CONFIG[action.type] || {
        icon: AlertCircle,
        label: action.type,
        color: "text-muted-foreground",
        bgColor: "bg-slate-500/10 border-border/20",
    };

    const Icon = config.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "p-4 rounded-xl border backdrop-blur-sm",
                config.bgColor,
                className
            )}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        config.bgColor
                    )}>
                        <Icon size={20} className={config.color} />
                    </div>
                    <div>
                        <h4 className="font-bold text-foreground text-sm uppercase tracking-wider">
                            {config.label}
                        </h4>
                        <p className="text-muted-foreground text-sm">
                            {typeof action.target.id === 'string'
                                ? action.target.id
                                : `${action.target.type} #${action.target.id}`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Reason / Evidence */}
            <div className="mb-4">
                <p className="text-sm text-foreground/80 leading-relaxed">
                    {action.reason}
                </p>

                {/* Mastery indicator if concept provided */}
                {concept && (
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                            Mastery: <span className={cn(
                                concept.mastery < 0.3 ? "text-destructive" :
                                    concept.mastery < 0.7 ? "text-warning" : "text-accent-olive"
                            )}>{Math.round(concept.mastery * 100)}%</span>
                        </span>
                        <span>
                            Stability: <span className={cn(
                                concept.stability < 0.5 ? "text-warning" : "text-muted-foreground"
                            )}>{Math.round(concept.stability * 100)}%</span>
                        </span>
                    </div>
                )}
            </div>

            {/* Execute Button */}
            <Button
                onClick={onExecute}
                size="sm"
                className={cn(
                    "w-full",
                    action.type === "REINFORCE_GRAPH"
                        ? "bg-destructive/20 hover:bg-destructive/30 text-red-300 border border-red-500/30"
                        : "bg-foreground/10 hover:bg-foreground/15 text-foreground border border-border"
                )}
            >
                <Play size={14} className="mr-2" />
                Start
            </Button>
        </motion.div>
    );
}
