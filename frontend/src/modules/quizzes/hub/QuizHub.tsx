/**
 * QuizHub - Quiz Discovery & Creation View
 *
 * Main component for the quiz listing page.
 * Orchestrates card grid and generation modal.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FileQuestion, PanelLeftIcon, MenuIcon } from "lucide-react"; // Icons for empty state & toggle
import { cn } from "@/lib/utils";
import { useQuizHub } from "./hooks/useQuizHub";
import { QuizCard } from "./QuizCard";
import { QuizGenerator } from "./QuizGenerator";
import type { QuizResponse } from "@/api/generated";
import { EmptyState, AuroraBackground } from "@/shared/ui";
import { QuizzesSidebar } from "./QuizzesSidebar"; // New Sidebar
import { QuizDock } from "./QuizDock"; // New Dock
import { Sheet, SheetContent } from "@/components/ui/sheet"; // For Mobile Sidebar
import { Button } from "@/components/ui/button"; // For Toggles

export function QuizHub() {
    const navigate = useNavigate();
    const { quizzes, isLoading, generateQuiz, isGenerating } = useQuizHub();

    const [searchQuery, setSearchQuery] = useState("");
    const [showGenerator, setShowGenerator] = useState(false);
    
    // Layout State
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [activeFilter, setActiveFilter] = useState("All");

    // Load sidebar state
    useEffect(() => {
        const saved = localStorage.getItem("quizzesSidebarCollapsed");
        if (saved) {
            setSidebarCollapsed(JSON.parse(saved));
        }
    }, []);

    const toggleSidebar = () => {
        const newState = !sidebarCollapsed;
        setSidebarCollapsed(newState);
        localStorage.setItem("quizzesSidebarCollapsed", JSON.stringify(newState));
    };

    // Filter quizzes
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
        <AuroraBackground className="fixed inset-0 min-h-screen flex flex-col pt-16" fixed>
            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <div className="flex flex-1 overflow-hidden">
                {/* Desktop Sidebar */}
                <div
                    className={cn(
                        "hidden lg:block transition-all duration-300 ease-in-out relative z-10 py-4 pl-3",
                        sidebarCollapsed ? "w-0 p-0" : "w-[17rem]",
                    )}
                >
                    <QuizzesSidebar
                        activeFilter={activeFilter}
                        onFilterChange={setActiveFilter}
                        totalQuizzes={quizzes?.length || 0}
                        onNewQuiz={() => setShowGenerator(true)}
                        className="w-full h-full rounded-2xl"
                        isCollapsed={sidebarCollapsed}
                    />
                </div>

                {/* Mobile Sidebar */}
                <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                    <SheetContent
                        side="left"
                        className="w-64 p-0 border-none [&>button]:hidden bg-[#050505]/95 backdrop-blur-xl"
                    >
                        <QuizzesSidebar
                            activeFilter={activeFilter}
                            onFilterChange={(f) => { setActiveFilter(f); setMobileSidebarOpen(false); }}
                            totalQuizzes={quizzes?.length || 0}
                            onNewQuiz={() => { setShowGenerator(true); setMobileSidebarOpen(false); }}
                            className="w-64"
                        />
                    </SheetContent>
                </Sheet>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden relative z-0">
                    {/* Always Visible Toggle Button */}
                    <div className="absolute top-4 left-4 z-50 flex items-center gap-2 pointer-events-none">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleSidebar}
                            className="hidden lg:flex pointer-events-auto hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors"
                        >
                            <PanelLeftIcon className="size-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMobileSidebarOpen(true)}
                            className="lg:hidden pointer-events-auto hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors"
                        >
                            <MenuIcon className="size-5" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 pb-32 relative scrollbar-hide">
                         <div className="max-w-[1600px] mx-auto">
                            <div className="mb-8 pt-2 pl-12 lg:pl-0">
                                {/* Page Header */}
                                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                                    {activeFilter === "All" ? "All Quizzes" : activeFilter}
                                </h1>
                                <p className="text-slate-400">Test your knowledge and track your progress.</p>
                            </div>

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
                                <EmptyState
                                    className="mt-20"
                                    icon={FileQuestion}
                                    title={searchQuery ? "No quizzes found" : "No quizzes yet"}
                                    description={
                                        searchQuery
                                            ? "Try a different search term to find what you're looking for."
                                            : "Create your first quiz to start testing your knowledge."
                                    }
                                    action={
                                        !searchQuery ? {
                                            label: "Generate Quiz",
                                            onClick: () => setShowGenerator(true),
                                        } : undefined
                                    }
                                />
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
                    </div>
                </div>
            </div>

            {/* Floating Dock */}
            <QuizDock
                viewMode={viewMode}
                onViewChange={setViewMode}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onImport={() => {}} // Placeholder for now
            />

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
        </AuroraBackground>
    );
}
