import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { QuizzesService } from "@/api/generated";
import { queryKeys } from "@/lib/queryKeys";
import { QuizResultsView } from "./components/results/QuizResultsView";
import type { QuizAttemptStart, AnswerSubmit } from "@/api/generated";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  Clock,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { NeumorphicButton, NeumorphicCard } from "@/components/neumorphic";

interface QuestionState {
  answered: boolean;
  selectedAnswer: string | null;
  isCorrect: boolean | null;
  showExplanation: boolean;
}

/**
 * QuizTakePage - Neumorphic Deep Space Refactor
 */
export function QuizTakePage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const id = parseInt(quizId || "0", 10);

  // Core State
  const [currentIdx, setCurrentIdx] = useState(0);
  const [questionStates, setQuestionStates] = useState<
    Map<number, QuestionState>
  >(new Map());
  const [attemptData, setAttemptData] = useState<QuizAttemptStart | null>(null);

  // UI State
  const [gameState, setGameState] = useState<"LOADING" | "ACTIVE" | "RESULTS">(
    "LOADING",
  );
  const [showHint, setShowHint] = useState(false);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer
  useEffect(() => {
    if (gameState === "ACTIVE") {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [gameState, startTime]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Start Quiz
  const { mutate: startAttempt } = useMutation({
    mutationFn: async () => {
      return QuizzesService.startQuizAttemptApiV1QuizzesQuizIdStartPost(
        Number(id),
      );
    },
    onSuccess: (data) => {
      setAttemptData(data);
      setGameState("ACTIVE");
    },
    onError: (error) => {
      toast.error("Failed to start quiz", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      navigate("/quizzes");
    },
  });

  // Submit Quiz
  const {
    mutate: submitQuiz,
    data: results,
    isPending: isSubmitting,
  } = useMutation({
    mutationFn: async () => {
      if (!attemptData) throw new Error("No attempt data");
      const answersArray: AnswerSubmit[] = [];

      questionStates.forEach((state, qId) => {
        if (state.selectedAnswer) {
          answersArray.push({
            question_id: qId,
            answer: state.selectedAnswer,
          });
        }
      });

      return QuizzesService.submitQuizAttemptApiV1QuizzesAttemptsAttemptIdSubmitPost(
        attemptData.attempt_id,
        answersArray,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all });
      setGameState("RESULTS");
    },
    onError: (error) => {
      toast.error("Failed to submit quiz", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  useEffect(() => {
    if (id && !attemptData) startAttempt();
  }, [id]);

  // Get current question state
  const getCurrentState = useCallback(
    (questionId: number): QuestionState => {
      return (
        questionStates.get(questionId) || {
          answered: false,
          selectedAnswer: null,
          isCorrect: null,
          showExplanation: false,
        }
      );
    },
    [questionStates],
  );

  // Handle answer selection with real-time feedback
  const handleAnswer = (
    questionId: number,
    answer: string,
    correctAnswer: string,
  ) => {
    const isCorrect =
      answer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();

    setQuestionStates((prev) => {
      const newMap = new Map(prev);
      newMap.set(questionId, {
        answered: true,
        selectedAnswer: answer,
        isCorrect,
        showExplanation: true,
      });
      return newMap;
    });
  };

  // Navigation
  const goToQuestion = (idx: number) => {
    if (
      attemptData?.questions &&
      idx >= 0 &&
      idx < attemptData.questions.length
    ) {
      setCurrentIdx(idx);
      setShowHint(false);
    }
  };

  const handleFinish = () => {
    const answeredCount = Array.from(questionStates.values()).filter(
      (s) => s.answered,
    ).length;
    const totalQuestions = attemptData?.questions.length || 0;

    if (answeredCount < totalQuestions) {
      if (
        !confirm(
          `You've only answered ${answeredCount} of ${totalQuestions} questions. Submit anyway?`,
        )
      ) {
        return;
      }
    }
    submitQuiz();
  };

  // Calculate stats
  const getStats = () => {
    const answered = Array.from(questionStates.values());
    const correct = answered.filter((s) => s.isCorrect === true).length;
    const total = attemptData?.questions.length || 0;

    return {
      answered: answered.filter((s) => s.answered).length,
      correct,
      total,
      percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
    };
  };

  // Loading State
  if (gameState === "LOADING" || !attemptData?.questions) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center nm-bg nm-constellation-bg">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
        <p className="text-slate-400 text-sm tracking-widest uppercase">
          Initializing Simulation...
        </p>
      </div>
    );
  }

  // Results State
  if (gameState === "RESULTS" && results) {
    const stats = getStats();
    const percentage = results.percentage || 0;

    const getRank = (pct: number) => {
      if (pct >= 90)
        return {
          grade: "A+",
          color: "text-emerald-400",
          bg: "bg-emerald-500/10",
        };
      if (pct >= 80)
        return {
          grade: "A",
          color: "text-emerald-400",
          bg: "bg-emerald-500/10",
        };
      if (pct >= 70)
        return { grade: "B", color: "text-cyan-400", bg: "bg-cyan-500/10" };
      if (pct >= 60)
        return { grade: "C", color: "text-yellow-400", bg: "bg-yellow-500/10" };
      return { grade: "D", color: "text-red-400", bg: "bg-red-500/10" };
    };
    const rank = getRank(percentage);

    const performanceProp = {
      score: percentage,
      percentage: percentage,
      rank: rank,
      maxStreak: 0,
      duration: elapsedTime,
      correctCount: stats.correct,
      totalCount: stats.total,
    };

    return (
      <div className="h-screen nm-bg nm-constellation-bg overflow-y-auto">
        <QuizResultsView
          performance={performanceProp}
          attemptData={attemptData!}
          results={results}
          onReturn={() => navigate("/quizzes")}
        />
      </div>
    );
  }

  // Active Quiz State
  const questions = attemptData.questions;
  const currentQ = questions[currentIdx];

  if (!currentQ) {
    return (
      <div className="h-screen flex flex-col items-center justify-center nm-bg nm-constellation-bg">
        <p className="text-slate-400">Question not found</p>
      </div>
    );
  }

  const currentState = getCurrentState(currentQ.id);
  const options =
    typeof currentQ.options === "object" && currentQ.options !== null
      ? Object.entries(currentQ.options as Record<string, string>)
      : [];
  const stats = getStats();
  const correctAnswer = (currentQ as any).correct_answer || "";
  const explanation = (currentQ as any).explanation || "";

  return (
    <div className="h-screen nm-bg nm-constellation-bg flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-8 bg-[#0a0a0f]/50 backdrop-blur-sm border-b border-white/5 shrink-0 z-20">
        <button
          onClick={() => {
            if (confirm("Exit simulation? Progress will be saved/submitted.")) {
              handleFinish();
            }
          }}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="font-medium">Exit</span>
        </button>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <span className="text-cyan-400 font-mono text-lg font-bold">
            Q{currentIdx + 1}
          </span>
          <span className="text-slate-600 font-mono">/</span>
          <span className="text-slate-500 font-mono">{questions.length}</span>
        </div>

        <div className="flex items-center gap-6 text-sm font-mono">
          <div className="flex items-center gap-2 text-slate-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
            <Clock size={14} className="text-cyan-500" />
            {formatTime(elapsedTime)}
          </div>
          <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
            <CheckCircle size={14} />
            {stats.correct}
          </div>
        </div>
      </div>

      {/* Glowing Gradient Progress Line */}
      <div className="h-[2px] w-full bg-white/5 shrink-0 relative">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-purple-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-8 flex justify-center">
        <div className="max-w-3xl w-full space-y-8">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Question Card */}
            <NeumorphicCard className="p-8">
              <h2 className="text-2xl font-medium text-slate-100 leading-relaxed mb-8">
                {currentQ.question_text}
              </h2>

              {/* Options */}
              <div className="space-y-3">
                {options.map(([key, value]) => {
                  const optionLetter = key;
                  const optionText =
                    typeof value === "string" ? value : String(value);
                  const isSelected =
                    currentState.selectedAnswer === optionLetter;
                  const isAnswered = currentState.answered;
                  const isThisCorrect =
                    optionLetter.toLowerCase() === correctAnswer.toLowerCase();

                  let statusClass =
                    "border-white/5 bg-black/20 text-slate-300 hover:border-cyan-500/30 hover:bg-cyan-500/5";
                  let indicator = (
                    <span className="font-mono text-sm opacity-50">
                      {optionLetter}.
                    </span>
                  );

                  if (isAnswered) {
                    if (isThisCorrect) {
                      statusClass =
                        "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
                      indicator = (
                        <CheckCircle size={18} className="text-emerald-400" />
                      );
                    } else if (isSelected) {
                      statusClass =
                        "border-red-500/50 bg-red-500/10 text-red-400";
                      indicator = (
                        <XCircle size={18} className="text-red-400" />
                      );
                    } else {
                      statusClass =
                        "border-white/5 bg-black/20 text-slate-500 opacity-50";
                    }
                  }

                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (!isAnswered) {
                          handleAnswer(
                            currentQ.id,
                            optionLetter,
                            correctAnswer,
                          );
                        }
                      }}
                      disabled={isAnswered}
                      className={cn(
                        "w-full p-5 rounded-xl border text-left transition-all duration-200 flex items-start gap-4 group",
                        statusClass,
                      )}
                    >
                      <div className="mt-0.5 shrink-0 w-6 flex justify-center">
                        {indicator}
                      </div>
                      <span className="flex-1 text-base leading-relaxed">
                        {optionText}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Auto-Explanation */}
              <AnimatePresence>
                {currentState.answered && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className={cn(
                      "overflow-hidden rounded-xl border p-5",
                      currentState.isCorrect
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-[#0a0a0f] border-white/10",
                    )}
                  >
                    <div className="flex gap-3">
                      <div className="shrink-0 mt-1">
                        {currentState.isCorrect ? (
                          <div className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-400">
                            <CheckCircle size={16} />
                          </div>
                        ) : (
                          <div className="p-1.5 rounded-full bg-slate-800 text-slate-400">
                            <Lightbulb size={16} />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4
                          className={cn(
                            "font-bold mb-1 text-sm uppercase tracking-wider",
                            currentState.isCorrect
                              ? "text-emerald-400"
                              : "text-slate-300",
                          )}
                        >
                          {currentState.isCorrect
                            ? "Correct Analysis"
                            : "Insight"}
                        </h4>
                        <p className="text-slate-400 leading-relaxed text-sm">
                          {explanation || "No additional explanation provided."}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </NeumorphicCard>

            {/* Collapsible Hint */}
            {!currentState.answered && (
              <div className="flex justify-end">
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="text-xs font-medium text-slate-500 hover:text-cyan-400 flex items-center gap-1.5 transition-colors"
                >
                  <Lightbulb size={14} />
                  {showHint ? "Hide Hint" : "Show Hint"}
                </button>
              </div>
            )}
            <AnimatePresence>
              {showHint && !currentState.answered && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4 text-cyan-200/80 text-sm italic"
                >
                  Think about the core concept being tested. Eliminate obviously
                  incorrect answers first.
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="h-20 border-t border-white/5 bg-[#13151a]/80 backdrop-blur-md px-8 shrink-0 flex items-center justify-between">
        <button
          onClick={() => goToQuestion(currentIdx - 1)}
          disabled={currentIdx === 0}
          className="flex items-center gap-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors font-medium px-4 py-2"
        >
          <ArrowLeft size={16} />
          Previous
        </button>

        {/* Question Dots */}
        <div className="flex gap-1.5 overflow-x-auto max-w-md px-4 scrollbar-hide">
          {questions.map((q, idx) => {
            const state = getCurrentState(q.id);
            return (
              <button
                key={idx}
                onClick={() => goToQuestion(idx)}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all",
                  idx === currentIdx
                    ? "bg-cyan-400 scale-125 shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                    : state.answered
                      ? state.isCorrect
                        ? "bg-emerald-500/50"
                        : "bg-red-500/50"
                      : "bg-white/10 hover:bg-white/30",
                )}
                title={`Question ${idx + 1}`}
              />
            );
          })}
        </div>

        {currentIdx === questions.length - 1 ? (
          <NeumorphicButton
            onClick={handleFinish}
            disabled={isSubmitting}
            variant="primary"
            className="px-8 shadow-cyan-500/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              <>
                <Award size={16} className="mr-2" />
                Finish Simulation
              </>
            )}
          </NeumorphicButton>
        ) : (
          <NeumorphicButton
            onClick={() => goToQuestion(currentIdx + 1)}
            variant="ghost"
            className="px-8 bg-white/5 hover:bg-white/10"
          >
            Next
            <ArrowRight size={16} className="ml-2" />
          </NeumorphicButton>
        )}
      </div>
    </div>
  );
}
