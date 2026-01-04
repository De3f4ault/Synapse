/**
 * QuizHub - Quiz Discovery & Creation View
 *
 * Main component for the quiz listing page.
 * Orchestrates card grid and generation modal.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Wand2, FileQuestion, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuizHub } from "./hooks/useQuizHub";
import { QuizCard } from "./QuizCard";
import { QuizGenerator } from "./QuizGenerator";
import type { QuizResponse } from "@/api/generated";

export function QuizHub() {
    const navigate = useNavigate();
    const { quizzes, isLoading, generateQuiz, isGenerating } = useQuizHub();

    const [searchQuery, setSearchQuery] = useState("");
    const [showGenerator, setShowGenerator] = useState(false);

    // Filter quizzes by search
    const filteredQuizzes = (quizzes as QuizResponse[]).filter((quiz) =>
        quiz.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08 },
        },
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.3, ease: "easeOut" },
        },
    };

    return (
        <div className="relative min-h-screen bg-[#08080c] flex flex-col">
            {/* Hide scrollbar */}
            <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

            {/* Top Bar: Search */}
            <div className="flex-none pt-8 pb-4 px-8 bg-gradient-to-b from-[#08080c] via-[#08080c]/90 to-transparent z-30">
                <div className="max-w-xl mx-auto">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search quizzes..."
                            className={cn(
                                "w-full h-12 pl-12 pr-12",
                                "bg-[#0c0c12] border border-white/[0.06] rounded-full",
                                "text-slate-200 placeholder:text-slate-500",
                                "focus:outline-none focus:border-cyan-500/40",
                                "transition-all"
                            )}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute inset-y-0 right-4 flex items-center text-slate-500 hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-8 pt-0 pb-32">
                {/* Loading State */}
                {isLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => (
                            <div
                                key={i}
                                className="h-64 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse"
                            />
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && filteredQuizzes.length === 0 && (
                    <div className="h-[60vh] flex flex-col items-center justify-center">
                        <div className="w-20 h-20 rounded-2xl bg-white/[0.03] flex items-center justify-center text-slate-600 mb-6 border border-white/[0.06]">
                            <FileQuestion size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">
                            {searchQuery ? "No quizzes found" : "No quizzes yet"}
                        </h3>
                        <p className="text-slate-400 mb-8 max-w-xs text-center text-sm">
                            {searchQuery
                                ? "Try a different search term."
                                : "Create your first quiz to start learning."}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={() => setShowGenerator(true)}
                                className="px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-500/20"
                            >
                                <Wand2 size={16} />
                                Generate Quiz
                            </button>
                        )}
                    </div>
                )}

                {/* Quiz Grid */}
                {!isLoading && filteredQuizzes.length > 0 && (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    >
                        {filteredQuizzes.map((quiz) => (
                            <QuizCard
                                key={quiz.id}
                                quiz={quiz}
                                variants={cardVariants}
                                onStart={() => navigate(`/quizzes/${quiz.id}/take`)}
                            />
                        ))}
                    </motion.div>
                )}
            </div>

            {/* FAB: New Quiz */}
            <div className="fixed bottom-8 right-8 z-40">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowGenerator(true)}
                    className={cn(
                        "h-14 px-8 rounded-full flex items-center gap-2",
                        "bg-gradient-to-r from-purple-600 to-indigo-600 text-white",
                        "font-bold tracking-wide text-base",
                        "shadow-xl shadow-purple-500/20",
                        "hover:shadow-[0_0_25px_rgba(168,85,247,0.4)]",
                        "transition-all"
                    )}
                >
                    <Wand2 size={20} strokeWidth={2.5} />
                    New Quiz
                </motion.button>
            </div>

            {/* Generator Modal */}
            <AnimatePresence>
                {showGenerator && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
                        onClick={(e) => e.target === e.currentTarget && setShowGenerator(false)}
                    >
                        <QuizGenerator
                            onGenerate={(request) => {
                                generateQuiz(request, {
                                    onSuccess: () => setShowGenerator(false),
                                });
                            }}
                            isGenerating={isGenerating}
                            onClose={() => setShowGenerator(false)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
