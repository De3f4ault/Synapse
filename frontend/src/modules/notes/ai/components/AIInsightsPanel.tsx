/**
 * Notes Module - AIInsightsPanel Component
 * Bottom drawer for AI-generated insights.
 *
 * MIGRATED FROM: pages/notes/components/editor/AIInsightsPanel.tsx
 */

import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles,
    Copy,
    Save,
    X,
    ChevronDown,
    ChevronUp,
    Lightbulb,
    Tags,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { NeumorphicButton, NeumorphicCard } from "@/components/neumorphic";
import type { AIInsight } from "../hooks/useNoteAI";

// ============================================================================
// Types
// ============================================================================

interface AIInsightsPanelProps {
    insights: AIInsight[];
    isOpen: boolean;
    onClose: () => void;
    onSaveToNote: (content: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export const AIInsightsPanel = ({
    insights,
    isOpen,
    onClose,
    onSaveToNote,
}: AIInsightsPanelProps) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const handleCopy = (content: string) => {
        navigator.clipboard.writeText(content);
        toast.success("Copied to clipboard");
    };

    const handleSave = (content: string) => {
        onSaveToNote(content);
        toast.success("Added to note");
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: isExpanded ? 0 : "calc(100% - 60px)" }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    className="fixed bottom-0 left-0 right-0 z-40 max-h-[60vh] flex flex-col"
                >
                    <NeumorphicCard
                        className="h-full flex flex-col rounded-t-3xl rounded-b-none border-b-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] bg-popover backdrop-blur-xl p-0"
                    >
                        {/* Header */}
                        <div
                            className="flex items-center justify-between px-6 py-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors rounded-t-3xl"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-muted border border-border rounded-lg flex items-center justify-center text-accent">
                                    <Sparkles size={16} />
                                </div>
                                <h3 className="font-bold text-foreground/70">AI Insights</h3>
                                <span className="px-2 py-0.5 bg-accent/10 text-accent rounded-md text-xs font-mono border border-accent/20">
                                    {insights.length}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <NeumorphicButton
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsExpanded(!isExpanded);
                                    }}
                                >
                                    {isExpanded ? (
                                        <ChevronDown size={16} />
                                    ) : (
                                        <ChevronUp size={16} />
                                    )}
                                </NeumorphicButton>
                                <NeumorphicButton
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:text-destructive"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClose();
                                    }}
                                >
                                    <X size={16} />
                                </NeumorphicButton>
                            </div>
                        </div>

                        {/* Content */}
                        {isExpanded && (
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                                {insights.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Lightbulb size={48} className="mx-auto mb-4 opacity-20" />
                                        <p>
                                            No AI insights yet. Use AI tools to generate summaries and
                                            suggestions.
                                        </p>
                                    </div>
                                ) : (
                                    insights.map((insight, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className="bg-foreground/5 rounded-xl p-5 border border-border"
                                        >
                                            {/* Insight Header */}
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    {insight.type === "summary" && (
                                                        <Sparkles size={16} className="text-accent" />
                                                    )}
                                                    {insight.type === "tags" && (
                                                        <Tags size={16} className="text-primary" />
                                                    )}
                                                    {insight.type === "suggestions" && (
                                                        <Lightbulb size={16} className="text-warning" />
                                                    )}
                                                    <h4 className="font-bold text-foreground/70">
                                                        {insight.title}
                                                    </h4>
                                                </div>
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    {insight.timestamp.toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </span>
                                            </div>

                                            {/* Insight Content */}
                                            <div className="prose prose-sm prose-invert max-w-none mb-4 prose-p:text-muted-foreground prose-li:text-muted-foreground">
                                                {Array.isArray(insight.content) ? (
                                                    <ul className="list-disc list-inside space-y-1">
                                                        {insight.content.map((item, i) => (
                                                            <li key={i}>{item}</li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="leading-relaxed">{insight.content}</p>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-3 pt-4 border-t border-border">
                                                <NeumorphicButton
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() =>
                                                        handleCopy(
                                                            Array.isArray(insight.content)
                                                                ? insight.content.join("\n")
                                                                : insight.content,
                                                        )
                                                    }
                                                    className="h-8 text-xs"
                                                >
                                                    <Copy size={12} className="mr-1.5" />
                                                    Copy
                                                </NeumorphicButton>
                                                <NeumorphicButton
                                                    size="sm"
                                                    variant="primary"
                                                    onClick={() =>
                                                        handleSave(
                                                            Array.isArray(insight.content)
                                                                ? `\n\n**${insight.title}**\n${insight.content.map((item) => `- ${item}`).join("\n")}`
                                                                : `\n\n**${insight.title}**\n${insight.content}`,
                                                        )
                                                    }
                                                    className="h-8 text-xs"
                                                >
                                                    <Save size={12} className="mr-1.5" />
                                                    Add to Note
                                                </NeumorphicButton>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        )}
                    </NeumorphicCard>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
