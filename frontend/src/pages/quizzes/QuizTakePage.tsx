/**
 * QuizTakePage - Page Shell
 *
 * Pure orchestration layer. Manages quiz attempt lifecycle.
 * Renders QuizSession for active quizzes, QuizResults when completed.
 */

import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import {
  QuizAttemptState,
  QuizSession,
  QuizResults,
  useQuizAttempt,
  useQuizResults,
} from "@/modules/quizzes";

export function QuizTakePage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const id = parseInt(quizId || "0", 10);

  // Use the FSM-based attempt hook
  const attempt = useQuizAttempt(id);

  // Fetch results when completed
  const resultsHook = useQuizResults(attempt.results?.attempt_id || 0);

  // Loading State
  if (
    attempt.state === QuizAttemptState.IDLE ||
    attempt.state === QuizAttemptState.LOADING
  ) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#08080c]">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
        <p className="text-slate-400 text-sm tracking-widest uppercase">
          Initializing Quiz...
        </p>
      </div>
    );
  }

  // Error State
  if (attempt.state === QuizAttemptState.ERROR) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#08080c]">
        <p className="text-red-400 mb-4">Failed to load quiz</p>
        <p className="text-slate-500 text-sm mb-6">{attempt.error}</p>
        <button
          onClick={() => navigate("/quizzes")}
          className="px-6 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-white rounded-lg border border-white/[0.06]"
        >
          Return to Quizzes
        </button>
      </div>
    );
  }

  // Completed State - Show Results
  if (attempt.state === QuizAttemptState.COMPLETED && attempt.results) {
    return (
      <div className="h-screen bg-[#08080c]">
        <QuizResults
          results={attempt.results}
          performance={
            resultsHook.performance || {
              score: Number(attempt.results.score),
              percentage: attempt.results.percentage,
              rank: { grade: "?", color: "text-slate-400", bg: "bg-slate-500/10" },
              duration: attempt.results.time_taken_seconds,
              correctCount: attempt.results.answers.filter((a) => a.is_correct).length,
              totalCount: attempt.results.answers.length,
            }
          }
          insights={resultsHook.insights}
          isLoadingInsights={resultsHook.isLoadingInsights}
          insightsError={resultsHook.insightsError}
          onRefetchInsights={resultsHook.refetchInsights}
          onReturn={() => navigate("/quizzes")}
        />
      </div>
    );
  }

  // Active State - Show Quiz Session
  if (attempt.attemptData) {
    return (
      <QuizSession
        state={attempt.state}
        attemptData={attempt.attemptData}
        currentIndex={attempt.currentIndex}
        questionStates={attempt.questionStates}
        elapsedTime={attempt.elapsedTime}
        answer={attempt.answer}
        goToQuestion={attempt.goToQuestion}
        next={attempt.next}
        previous={attempt.previous}
        submit={attempt.submit}
        onExit={() => navigate("/quizzes")}
      />
    );
  }

  // Fallback
  return null;
}
