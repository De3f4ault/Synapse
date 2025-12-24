import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  TrendingUp,
  Clock,
  Target,
  Trophy,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import Confetti from "react-confetti";
import { useWindowSize } from "@/hooks/use-window-size";
import { ReviewCard } from "./ReviewCard";
import { ReviewTimer } from "./ReviewTimer";
import { useReviewSession } from "../../hooks/useReviewSession";
import { useReviewStore } from "../../stores/reviewStore";
import { cn } from "@/lib/utils";
import type { FlashcardResponse } from "@/api/generated";

/**
 * Enhanced Review Session Component
 *
 * Features:
 * - Smooth card transitions
 * - Animated progress bar
 * - Session timer (total + per card)
 * - Keyboard shortcuts (Space to flip, 1/3/5 for quality)
 * - Session summary with statistics
 * - Confetti celebration on completion
 * - Retry failed cards option
 */

interface ReviewSessionProps {
  cards: FlashcardResponse[];
  onComplete?: () => void;
}

export function ReviewSession({ cards, onComplete }: ReviewSessionProps) {
  const {
    startSession,
    isFlipped,
    flipCard,
    sessionStartTime,
    cardStartTime,
    reviewedCount,
    correctCount,
  } = useReviewStore();

  const {
    currentCard,
    currentIndex,
    totalCards,
    submitReview,
    isPending,
    isComplete,
  } = useReviewSession();

  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();

  // Initialize session
  useEffect(() => {
    if (cards.length > 0 && currentIndex === 0) {
      startSession(cards);
    }
  }, [cards, startSession, currentIndex]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isPending) return;

      // Space to flip
      if (e.code === "Space" && !isFlipped) {
        e.preventDefault();
        flipCard();
      }

      // Quality ratings (only when flipped)
      if (isFlipped && currentCard) {
        if (e.code === "Digit1") {
          e.preventDefault();
          handleSwipe(1);
        }
        if (e.code === "Digit3") {
          e.preventDefault();
          handleSwipe(3);
        }
        if (e.code === "Digit5") {
          e.preventDefault();
          handleSwipe(5);
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isFlipped, currentCard, isPending]);

  // Show confetti on completion
  useEffect(() => {
    if (isComplete) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isComplete]);

  // Handle swipe review
  const handleSwipe = (quality: number) => {
    if (currentCard && !isPending) {
      submitReview({ cardId: currentCard.id, quality });
    }
  };

  // No cards to review
  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">All Caught Up!</h2>
            <p className="text-muted-foreground">
              No cards due for review right now. Great work!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Session complete - show summary
  if (isComplete) {
    const accuracy =
      reviewedCount > 0 ? (correctCount / reviewedCount) * 100 : 0;
    const totalTime = sessionStartTime
      ? Math.floor((Date.now() - sessionStartTime) / 1000)
      : 0;
    const avgTimePerCard = reviewedCount > 0 ? totalTime / reviewedCount : 0;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center min-h-screen p-6"
      >
        {/* Confetti */}
        {showConfetti && (
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={500}
            gravity={0.3}
          />
        )}

        <Card className="max-w-2xl w-full">
          <CardContent className="pt-12 pb-8">
            {/* Trophy Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5 }}
              className="flex justify-center mb-6"
            >
              <div className="p-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
                <Trophy className="h-16 w-16 text-white" />
              </div>
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-center mb-2"
            >
              Session Complete!
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center text-muted-foreground mb-8"
            >
              Great work! Here's how you did:
            </motion.p>

            {/* Statistics Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
            >
              {/* Cards Reviewed */}
              <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6 text-center">
                  <CheckCircle2 className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {reviewedCount}
                  </p>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                    Cards Reviewed
                  </p>
                </CardContent>
              </Card>

              {/* Accuracy */}
              <Card
                className={cn(
                  accuracy >= 85
                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                    : accuracy >= 70
                      ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                      : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
                )}
              >
                <CardContent className="pt-6 text-center">
                  <Target
                    className={cn(
                      "h-8 w-8 mx-auto mb-2",
                      accuracy >= 85
                        ? "text-green-600 dark:text-green-400"
                        : accuracy >= 70
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-600 dark:text-red-400",
                    )}
                  />
                  <p
                    className={cn(
                      "text-2xl font-bold",
                      accuracy >= 85
                        ? "text-green-600 dark:text-green-400"
                        : accuracy >= 70
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {accuracy.toFixed(0)}%
                  </p>
                  <p
                    className={cn(
                      "text-xs",
                      accuracy >= 85
                        ? "text-green-600/70 dark:text-green-400/70"
                        : accuracy >= 70
                          ? "text-amber-600/70 dark:text-amber-400/70"
                          : "text-red-600/70 dark:text-red-400/70",
                    )}
                  >
                    Accuracy
                  </p>
                </CardContent>
              </Card>

              {/* Total Time */}
              <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
                <CardContent className="pt-6 text-center">
                  <Clock className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {Math.floor(totalTime / 60)}:
                    {(totalTime % 60).toString().padStart(2, "0")}
                  </p>
                  <p className="text-xs text-purple-600/70 dark:text-purple-400/70">
                    Total Time
                  </p>
                </CardContent>
              </Card>

              {/* Avg Time/Card */}
              <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
                <CardContent className="pt-6 text-center">
                  <TrendingUp className="h-8 w-8 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {avgTimePerCard.toFixed(1)}s
                  </p>
                  <p className="text-xs text-orange-600/70 dark:text-orange-400/70">
                    Avg per Card
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Performance Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="flex justify-center mb-8"
            >
              <Badge
                variant="outline"
                className={cn(
                  "text-lg px-6 py-2 font-bold",
                  accuracy >= 85
                    ? "bg-green-50 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-300"
                    : accuracy >= 70
                      ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300"
                      : "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/30 dark:text-blue-300",
                )}
              >
                {accuracy >= 85
                  ? "Excellent Performance!"
                  : accuracy >= 70
                    ? "Good Job!"
                    : "Keep Practicing!"}
              </Badge>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <Button
                variant="outline"
                size="lg"
                onClick={() => window.location.reload()}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Review Again
              </Button>
              <Button size="lg" onClick={onComplete}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Finish Session
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Active review session
  if (!currentCard) return null;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Progress Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">
              Card {currentIndex + 1} of {totalCards}
            </span>
            <span className="font-medium">
              {Math.round(((currentIndex + 1) / totalCards) * 100)}%
            </span>
          </div>
          <Progress
            value={((currentIndex + 1) / totalCards) * 100}
            className="h-2"
          />
        </motion.div>

        {/* Timer */}
        <div className="flex justify-center">
          <ReviewTimer
            sessionStartTime={sessionStartTime}
            cardStartTime={cardStartTime}
          />
        </div>

        {/* Card Display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCard.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ duration: 0.3 }}
            className="py-8"
          >
            <ReviewCard
              card={currentCard}
              isFlipped={isFlipped}
              onFlip={flipCard}
              onSwipe={handleSwipe}
              disabled={isPending}
            />
          </motion.div>
        </AnimatePresence>

        {/* Manual Quality Buttons (fallback) */}
        {isFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center gap-4 pb-8"
          >
            <Button
              variant="destructive"
              size="lg"
              onClick={() => handleSwipe(1)}
              disabled={isPending}
              className="min-w-[120px]"
            >
              <kbd className="mr-2 px-2 py-0.5 text-xs font-semibold bg-destructive-foreground/10 border rounded">
                1
              </kbd>
              Again
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleSwipe(3)}
              disabled={isPending}
              className="min-w-[120px]"
            >
              <kbd className="mr-2 px-2 py-0.5 text-xs font-semibold bg-muted border rounded">
                3
              </kbd>
              Good
            </Button>
            <Button
              variant="default"
              size="lg"
              onClick={() => handleSwipe(5)}
              disabled={isPending}
              className="min-w-[120px]"
            >
              <kbd className="mr-2 px-2 py-0.5 text-xs font-semibold bg-primary-foreground/10 border rounded">
                5
              </kbd>
              Easy
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
