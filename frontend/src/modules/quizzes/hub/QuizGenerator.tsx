/**
 * QuizGenerator - AI Quiz Creation Modal
 *
 * Dark themed modal for generating quizzes via AI.
 * Replaces the old "Architect" modal with cleaner code.
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Brain, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUIZ_INVARIANTS, QUIZ_UI, QuizDifficulty } from "../core";
import type { QuizGenerateRequest } from "@/api/generated";

interface QuizGeneratorProps {
    onGenerate: (request: QuizGenerateRequest) => void;
    isGenerating: boolean;
    onClose: () => void;
}

const DIFFICULTIES: QuizDifficulty[] = [
    QuizDifficulty.EASY,
    QuizDifficulty.MEDIUM,
    QuizDifficulty.HARD,
];

export const QuizGenerator: React.FC<QuizGeneratorProps> = ({
    onGenerate,
    isGenerating,
    onClose,
}) => {
    const [topic, setTopic] = useState("");
    const [difficulty, setDifficulty] = useState<QuizDifficulty>(
        QuizDifficulty.MEDIUM
    );
    const [numQuestions, setNumQuestions] = useState<number>(QUIZ_UI.DEFAULT_QUESTION_COUNT);

    const handleSubmit = () => {
        if (!topic.trim() || isGenerating) return;

        onGenerate({
            topic: topic.trim(),
            num_questions: numQuestions,
            difficulty: difficulty as any, // API expects lowercase string
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && topic.trim() && !isGenerating) {
            handleSubmit();
        }
        if (e.key === "Escape") {
            onClose();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
                "relative max-w-lg w-full p-10 text-center space-y-6",
                // Dark solid card
                "bg-card border border-border rounded-2xl",
                // Subtle glow
                "shadow-[0_0_60px_rgba(168,85,247,0.06)]"
            )}
        >
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
                <X size={20} />
            </button>

            {/* Header */}
            <div>
                <div className="w-16 h-16 mx-auto bg-accent/10 rounded-full flex items-center justify-center border border-accent/20 mb-6">
                    <Brain size={28} className="text-accent" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
                    Generate Quiz
                </h2>
                <p className="text-muted-foreground text-sm">
                    Create a quiz on any topic using AI.
                </p>
            </div>

            {/* Form */}
            <div className="space-y-4">
                {/* Topic Input */}
                <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. Molecular Biology, History of Rome..."
                    className={cn(
                        "w-full text-center text-lg py-3 px-4",
                        "text-foreground placeholder:text-muted-foreground",
                        "bg-muted border border-border rounded-xl",
                        "focus:border-accent/50 focus:ring-1 focus:ring-accent/30",
                        "outline-none transition-colors"
                    )}
                    disabled={isGenerating}
                    autoFocus
                />

                {/* Difficulty Selection */}
                <div className="flex gap-2 justify-center">
                    {DIFFICULTIES.map((d) => (
                        <button
                            key={d}
                            onClick={() => setDifficulty(d)}
                            disabled={isGenerating}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize",
                                difficulty === d
                                    ? d === QuizDifficulty.EASY
                                        ? "bg-accent-olive/15 text-accent-olive border border-emerald-500/40"
                                        : d === QuizDifficulty.MEDIUM
                                            ? "bg-warning/15 text-warning border border-amber-500/40"
                                            : "bg-destructive/15 text-destructive border border-red-500/40"
                                    : "bg-muted/30 text-muted-foreground border border-border hover:border-white/[0.12]"
                            )}
                        >
                            {d}
                        </button>
                    ))}
                </div>

                {/* Question Count */}
                <div className="flex items-center justify-center gap-4">
                    <span className="text-muted-foreground text-sm font-mono uppercase tracking-wider">
                        Questions:
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() =>
                                setNumQuestions(
                                    Math.max(QUIZ_INVARIANTS.AI_MIN_QUESTIONS, numQuestions - QUIZ_UI.QUESTION_COUNT_STEP)
                                )
                            }
                            disabled={isGenerating || numQuestions <= QUIZ_INVARIANTS.AI_MIN_QUESTIONS}
                            className="w-8 h-8 rounded bg-white/[0.04] text-foreground/80 hover:bg-white/[0.08] disabled:opacity-50 transition-colors border border-border"
                        >
                            -
                        </button>
                        <span className="text-foreground font-medium w-8 text-center">
                            {numQuestions}
                        </span>
                        <button
                            onClick={() =>
                                setNumQuestions(
                                    Math.min(QUIZ_INVARIANTS.AI_MAX_QUESTIONS, numQuestions + QUIZ_UI.QUESTION_COUNT_STEP)
                                )
                            }
                            disabled={isGenerating || numQuestions >= QUIZ_INVARIANTS.AI_MAX_QUESTIONS}
                            className="w-8 h-8 rounded bg-white/[0.04] text-foreground/80 hover:bg-white/[0.08] disabled:opacity-50 transition-colors border border-border"
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-center pt-4">
                <button
                    onClick={onClose}
                    disabled={isGenerating}
                    className="px-6 py-2.5 rounded-lg text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-white/[0.06] border border-border transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={isGenerating || !topic.trim()}
                    className={cn(
                        "px-8 py-2.5 rounded-lg font-medium flex items-center gap-2",
                        "bg-primary text-primary-foreground",
                        "hover:bg-primary/90",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transition-all shadow-lg "
                    )}
                >
                    {isGenerating ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Generate
                        </>
                    )}
                </button>
            </div>
        </motion.div>
    );
};
