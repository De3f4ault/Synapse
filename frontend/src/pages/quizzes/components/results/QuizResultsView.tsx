import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, BrainCircuit, ArrowRight, Loader2 } from "lucide-react";
import { ResultsSummary } from "./ResultsSummary";
import { QuestionReview } from "./QuestionReview";
import type { QuizAttemptStart } from "@/api/generated";
import type { QuizPerformance } from "../../types/quizzes.types";

interface QuizResultsViewProps {
  performance: QuizPerformance;
  attemptData: QuizAttemptStart;
  results: any; // Using any for now as result type might vary
  onReturn: () => void; // Define the onReturn prop
}

export const QuizResultsView: React.FC<QuizResultsViewProps> = ({
  performance,
  attemptData,
  results,
  onReturn,
}) => {
  const [view, setView] = useState<"summary" | "review">("summary");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  // Mock AI Analysis (Replace with actual API call)
  const handleAnalyzePerformance = async () => {
    setIsAnalyzing(true);
    // Simulate API delay
    setTimeout(() => {
      setAiAnalysis(
        "Based on your results, you show strong understanding of core concepts but struggled with 'Indexing Strategies'. I recommend reviewing B-Tree vs GIN indexes. I've also noticed you hesitated on Question 4 - consider revising Transaction Isolation Levels.",
      );
      setIsAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-[#020408]">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-cyan-900/10 via-black to-black pointer-events-none" />

      {/* View Switcher (Simple Tab) */}
      {view === "review" && (
        <div className="absolute top-0 left-0 right-0 z-20 p-6 bg-gradient-to-b from-[#020408] to-transparent pointer-events-none">
          <button
            onClick={() => setView("summary")}
            className="pointer-events-auto flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/5"
          >
            <ArrowRight className="rotate-180" size={16} />
            <span className="text-sm font-medium">Back to Summary</span>
          </button>
        </div>
      )}

      {view === "summary" ? (
        <ResultsSummary performance={performance} onReturn={onReturn}>
          {/* AI Insight Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            {aiAnalysis ? (
              <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-4 text-left">
                <div className="flex items-center gap-2 mb-2 text-cyan-400">
                  <BrainCircuit size={16} />
                  <h3 className="font-bold text-[10px] uppercase tracking-wider">
                    AI Insight
                  </h3>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed mb-3">
                  {aiAnalysis}
                </p>
                <button className="text-[10px] bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-3 py-1.5 rounded border border-cyan-500/20 transition-colors w-full">
                  Create Flashcards for Weak Areas
                </button>
              </div>
            ) : (
              <button
                onClick={handleAnalyzePerformance}
                disabled={isAnalyzing}
                className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 hover:text-white rounded-lg transition-all text-xs flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Analyzing Patterns...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Analyze Performance
                  </>
                )}
              </button>
            )}

            <div className="mt-4 pt-4 border-t border-white/5">
              <button
                onClick={() => setView("review")}
                className="text-slate-400 hover:text-white text-[10px] uppercase tracking-wider flex items-center gap-2 justify-center mx-auto transition-colors"
              >
                Review Detailed Answers <ArrowRight size={12} />
              </button>
            </div>
          </motion.div>
        </ResultsSummary>
      ) : (
        <div className="h-full overflow-y-auto bg-[#020408]">
          <div className="max-w-4xl mx-auto p-6 pt-24 pb-20">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  Detailed Review
                </h2>
                <p className="text-slate-400">
                  Analyze your answers to improve retention
                </p>
              </div>
              <div className="flex gap-2">
                <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  Correct
                </div>
                <div className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Incorrect
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {results.answers?.map((answer: any, idx: number) => {
                const question = attemptData.questions.find(
                  (q) => q.id === answer.question_id,
                );
                return (
                  <QuestionReview
                    key={idx}
                    questionText={question?.question_text || "Unknown Question"}
                    userAnswer={answer.your_answer}
                    correctAnswer={answer.correct_answer}
                    isCorrect={answer.is_correct}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
