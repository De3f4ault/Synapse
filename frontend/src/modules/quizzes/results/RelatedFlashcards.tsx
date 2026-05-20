/**
 * RelatedFlashcards — Semantic Neighbor Display
 *
 * Phase Q3.3: Shows flashcards related to a quiz question after difficulty.
 * Advisory UI — suggests review opportunities without forcing action.
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, ChevronDown, ChevronUp, Sparkles, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useRelatedFlashcards } from "./hooks/useRelatedFlashcards";
import type { RelatedFlashcard } from "../core/learningApi";

interface RelatedFlashcardsProps {
    questionId: number;
    className?: string;
}

/** Map evidence strength to visual indicators */
function getEvidenceBadge(strength: RelatedFlashcard["evidence_strength"]) {
    switch (strength) {
        case "weak_recent":
            return { label: "Needs review", color: "text-warning", bg: "bg-warning/10" };
        case "weak_old":
            return { label: "Forgotten", color: "text-destructive", bg: "bg-destructive/10" };
        case "strong_recent":
            return { label: "Fresh", color: "text-accent-olive", bg: "bg-accent-olive/10" };
        case "strong_old":
            return { label: "Stable", color: "text-muted-foreground", bg: "bg-slate-500/10" };
        default:
            return { label: "Unreviewed", color: "text-muted-foreground", bg: "bg-slate-500/5" };
    }
}

export const RelatedFlashcards: React.FC<RelatedFlashcardsProps> = ({
    questionId,
    className,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const navigate = useNavigate();
    
    // Only fetch when expanded to save resources
    const { flashcards, isLoading, advisoryMessage } = useRelatedFlashcards({
        questionId,
        enabled: isExpanded,
        limit: 5,
    });

    const handleFlashcardClick = (flashcardId: number) => {
        // Navigate to the flashcard's deck (or a dedicated review page)
        // For now, we'll use a simple link pattern
        navigate(`/flashcards?highlight=${flashcardId}`);
    };

    return (
        <div className={cn("mt-3", className)}>
            {/* Toggle Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-primary/5 hover:bg-primary/10 border border-primary/10 transition-colors group"
            >
                <div className="flex items-center gap-2 text-primary/80 group-hover:text-primary/80">
                    <Layers size={14} />
                    <span className="text-xs font-medium">Related Flashcards</span>
                    <Sparkles size={10} className="opacity-50" />
                </div>
                {isExpanded ? (
                    <ChevronUp size={14} className="text-primary/60" />
                ) : (
                    <ChevronDown size={14} className="text-primary/60" />
                )}
            </button>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-2 space-y-2">
                            {isLoading ? (
                                <div className="text-xs text-muted-foreground px-3 py-2">
                                    Finding related cards...
                                </div>
                            ) : flashcards.length === 0 ? (
                                <div className="text-xs text-muted-foreground px-3 py-2 italic">
                                    {advisoryMessage || "No related flashcards found"}
                                </div>
                            ) : (
                                <>
                                    {/* Advisory Message */}
                                    {advisoryMessage && (
                                        <p className="text-xs text-muted-foreground px-3 italic">
                                            {advisoryMessage}
                                        </p>
                                    )}
                                    
                                    {/* Flashcard List */}
                                    {flashcards.map((card) => {
                                        const badge = getEvidenceBadge(card.evidence_strength);
                                        return (
                                            <button
                                                key={card.id}
                                                onClick={() => handleFlashcardClick(card.id)}
                                                className="w-full text-left px-3 py-2 rounded-lg bg-foreground/5 hover:bg-white/[0.05] border border-border transition-colors group"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <span className="text-xs text-foreground/80 line-clamp-2 flex-1">
                                                        {card.front_text}
                                                    </span>
                                                    <ExternalLink
                                                        size={12}
                                                        className="text-muted-foreground group-hover:text-primary shrink-0 mt-0.5"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    {/* Similarity Score */}
                                                    <span className="text-[10px] text-muted-foreground font-mono">
                                                        {Math.round(card.similarity * 100)}% match
                                                    </span>
                                                    
                                                    {/* Evidence Badge */}
                                                    <span
                                                        className={cn(
                                                            "text-[10px] px-1.5 py-0.5 rounded",
                                                            badge.bg,
                                                            badge.color
                                                        )}
                                                    >
                                                        {badge.label}
                                                    </span>
                                                    
                                                    {/* Days Since Review */}
                                                    {card.days_since_review !== null && (
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {card.days_since_review}d ago
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
