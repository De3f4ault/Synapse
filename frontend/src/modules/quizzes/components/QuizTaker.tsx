import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { QuestionCard } from "./QuestionCard";
import { useQuizAttempt } from "../hooks/useQuizAttempt";
import { ConfirmationModal } from "@/components/feedback/ConfirmationModal";
import type { QuizResponse, QuizResultResponse } from "@/api/generated";

/**
 * Quiz Taker Component - ENHANCED
 *
 * Take quiz with timer, progress tracking, flagging, and submission.
 *
 * Enhancements from documentation:
 * - Question flagging for review
 * - Improved timer with color coding
 * - Question navigation grid
 * - Submit confirmation
 * - Auto-submit on timeout
 * - Progress visualization
 * - Keyboard shortcuts
 */

interface QuizTakerProps {
  quiz: QuizResponse;
  onComplete?: (result: QuizResultResponse) => void;
  onCancel?: () => void;
}

export function QuizTaker({ quiz, onComplete, onCancel }: QuizTakerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(
    quiz.time_limit_minutes ? quiz.time_limit_minutes * 60 : null,
  );
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(
    new Set(),
  );
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showUnansweredWarning, setShowUnansweredWarning] = useState(false);

  const {
    attempt,
    startQuiz,
    submitQuiz,
    setAnswer,
    getAnswer,
    isStarting,
    isSubmitting,
    isComplete,
    answeredCount,
    totalQuestions,
  } = useQuizAttempt({
    quizId: quiz.id,
    onComplete,
  });

  // Start quiz on mount
  useEffect(() => {
    startQuiz();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || !attempt) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(interval);
          // Auto-submit when time runs out
          if (attempt && !isSubmitting) {
            submitQuiz();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, attempt, isSubmitting]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentQuestionIndex > 0) {
        setCurrentQuestionIndex((prev) => prev - 1);
      } else if (
        e.key === "ArrowRight" &&
        currentQuestionIndex < totalQuestions - 1
      ) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else if (e.key === "f" || e.key === "F") {
        toggleFlag(attempt?.questions[currentQuestionIndex]?.id);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentQuestionIndex, totalQuestions, attempt]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleFlag = (questionId: number | undefined) => {
    if (!questionId) return;
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitAttempt = () => {
    if (!isComplete) {
      setShowUnansweredWarning(true);
      return;
    }
    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = () => {
    setShowSubmitConfirm(false);
    submitQuiz();
  };

  const getTimeWarningLevel = (): "normal" | "warning" | "critical" => {
    if (!timeRemaining || !quiz.time_limit_minutes) return "normal";
    const percentRemaining =
      (timeRemaining / (quiz.time_limit_minutes * 60)) * 100;
    if (percentRemaining <= 10) return "critical";
    if (percentRemaining <= 25) return "warning";
    return "normal";
  };

  if (isStarting || !attempt) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-48 bg-muted rounded mx-auto" />
              <p className="text-muted-foreground">Loading quiz...</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const currentQuestion = attempt.questions[currentQuestionIndex];
  const timeWarningLevel = getTimeWarningLevel();
  const unansweredCount = totalQuestions - answeredCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-1">{quiz.title}</CardTitle>
              {quiz.description && (
                <p className="text-sm text-muted-foreground">
                  {quiz.description}
                </p>
              )}
            </div>

            {/* Timer */}
            {timeRemaining !== null && (
              <motion.div
                animate={
                  timeWarningLevel === "critical" ? { scale: [1, 1.05, 1] } : {}
                }
                transition={{ repeat: Infinity, duration: 1 }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-mono text-lg font-bold",
                  timeWarningLevel === "critical" &&
                    "border-red-500 bg-red-50 text-red-600 dark:bg-red-950",
                  timeWarningLevel === "warning" &&
                    "border-yellow-500 bg-yellow-50 text-yellow-600 dark:bg-yellow-950",
                  timeWarningLevel === "normal" && "border-border",
                )}
              >
                <Clock className="h-5 w-5" />
                {formatTime(timeRemaining)}
              </motion.div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </span>
              <span className="font-medium">
                {answeredCount} / {totalQuestions} answered
              </span>
            </div>
            <Progress
              value={(answeredCount / totalQuestions) * 100}
              className="h-2"
            />

            {unansweredCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Badge
                  variant="outline"
                  className="bg-yellow-50 border-yellow-300 text-yellow-700"
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {unansweredCount} question{unansweredCount === 1 ? "" : "s"}{" "}
                  remaining
                </Badge>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <QuestionCard
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            value={getAnswer(currentQuestion.id)}
            onChange={(value) => setAnswer(currentQuestion.id, value)}
            isFlagged={flaggedQuestions.has(currentQuestion.id)}
            onFlag={() => toggleFlag(currentQuestion.id)}
          />
        </motion.div>
      </AnimatePresence>

      {/* Navigation Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              size="lg"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => toggleFlag(currentQuestion.id)}
              >
                <Flag
                  className={cn(
                    "h-4 w-4",
                    flaggedQuestions.has(currentQuestion.id) &&
                      "fill-yellow-500 text-yellow-500",
                  )}
                />
              </Button>

              {onCancel && (
                <Button variant="outline" onClick={onCancel} size="lg">
                  Cancel
                </Button>
              )}
            </div>

            {currentQuestionIndex < totalQuestions - 1 ? (
              <Button onClick={handleNext} size="lg">
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmitAttempt}
                disabled={isSubmitting}
                size="lg"
                className="min-w-[140px]"
              >
                {isSubmitting ? (
                  "Submitting..."
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Quiz
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Question Navigator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Question Navigator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {attempt.questions.map((q, index) => {
              const isAnswered = !!getAnswer(q.id);
              const isCurrent = index === currentQuestionIndex;
              const isFlagged = flaggedQuestions.has(q.id);

              return (
                <motion.div
                  key={q.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="sm"
                    variant={isCurrent ? "default" : "outline"}
                    className={cn(
                      "relative w-full h-10",
                      isAnswered &&
                        !isCurrent &&
                        "bg-green-50 border-green-300 hover:bg-green-100 dark:bg-green-950",
                      isFlagged && "ring-2 ring-yellow-400",
                    )}
                    onClick={() => setCurrentQuestionIndex(index)}
                  >
                    {index + 1}
                    {isFlagged && (
                      <Flag className="absolute -top-1 -right-1 h-3 w-3 fill-yellow-500 text-yellow-500" />
                    )}
                  </Button>
                </motion.div>
              );
            })}
          </div>

          {flaggedQuestions.size > 0 && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Flag className="h-4 w-4 fill-yellow-500 text-yellow-500" />
              <span>
                {flaggedQuestions.size} question
                {flaggedQuestions.size === 1 ? "" : "s"} flagged for review
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Confirmation Modal */}
      <ConfirmationModal
        open={showSubmitConfirm}
        onOpenChange={setShowSubmitConfirm}
        onConfirm={handleConfirmSubmit}
        title="Submit Quiz?"
        description={`You've answered ${answeredCount} out of ${totalQuestions} questions. Are you sure you want to submit?`}
        confirmText="Submit Quiz"
        cancelText="Review Answers"
      />

      {/* Unanswered Warning Modal */}
      <ConfirmationModal
        open={showUnansweredWarning}
        onOpenChange={setShowUnansweredWarning}
        onConfirm={() => {
          setShowUnansweredWarning(false);
          setShowSubmitConfirm(true);
        }}
        title="Unanswered Questions"
        description={`You have ${unansweredCount} unanswered question${unansweredCount === 1 ? "" : "s"}. Submit anyway?`}
        confirmText="Submit Anyway"
        cancelText="Continue Quiz"
      />
    </div>
  );
}
