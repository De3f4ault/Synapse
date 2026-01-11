import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Target,
  TrendingUp,
  CheckCircle2,
  XCircle,
  SkipForward,
  Flag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/common/AnimatedCounter";
import { ConfirmationModal } from "@/components/feedback/ConfirmationModal";
import { useStudySession } from "../hooks/useStudySession";
import type { StudyItemResponse, StudySessionResponse } from "@/api/generated";

/**
 * Study Session Component - ENHANCED
 *
 * Unified study session for mixed learning content with better item rendering.
 *
 * Enhancements from documentation:
 * - Actual item content rendering (flashcard front/back, quiz questions)
 * - Smooth transitions between items
 * - Session statistics tracking
 * - Progress visualization
 * - End session confirmation
 * - Keyboard shortcuts
 */

interface StudySessionProps {
  items: StudyItemResponse[];
  sessionType?: "flashcard_review" | "quiz" | "mixed";
  onComplete?: (session: StudySessionResponse) => void;
  onCancel?: () => void;
}

export function StudySession({
  items,
  sessionType = "mixed",
  onComplete,
  onCancel,
}: StudySessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [startTime] = useState(Date.now());
  const [itemsCompleted, setItemsCompleted] = useState(0);
  const [itemsCorrect, setItemsCorrect] = useState(0);
  const [showingAnswer, setShowingAnswer] = useState(false);
  const [flaggedItems, setFlaggedItems] = useState<Set<number>>(new Set());
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const { startSession, completeSession, isStarting } =
    useStudySession({
      onComplete,
    });

  // Start session on mount
  useEffect(() => {
    const modules = Array.from(new Set(items.map((item) => item.type)));
    startSession(
      {
        // Cast to API type - values are compatible but TypeScript needs explicit cast
        session_type: sessionType as unknown as import("@/api/generated").StudySessionCreate["session_type"],
        modules,
      },
      {
        onSuccess: (result) => {
          setSessionId(result.response.id);
        },
      },
    );
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    // Ensure currentItem is defined before using it in the effect
    const currentItem = items[currentIndex];
    if (!currentItem) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        if (currentItem.type === "flashcard") {
          setShowingAnswer(!showingAnswer);
        }
      } else if (e.key === "1") {
        handleItemComplete(false);
      } else if (e.key === "2") {
        handleItemComplete(true);
      } else if (e.key === "f" || e.key === "F") {
        toggleFlag(currentIndex);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentIndex, showingAnswer]);

  const handleItemComplete = (isCorrect: boolean) => {
    setItemsCompleted((prev) => prev + 1);
    if (isCorrect) {
      setItemsCorrect((prev) => prev + 1);
    }

    setShowingAnswer(false);

    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Session complete
      if (sessionId) {
        completeSession();
      }
    }
  };

  const handleSkip = () => {
    setShowingAnswer(false);
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const toggleFlag = (index: number) => {
    setFlaggedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleEndSession = () => {
    if (sessionId) {
      completeSession();
    }
  };

  const calculateElapsedTime = (): string => {
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const calculateAccuracy = (): number => {
    if (itemsCompleted === 0) return 0;
    return (itemsCorrect / itemsCompleted) * 100;
  };

  if (isStarting || !sessionId) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-48 bg-muted rounded mx-auto" />
              <p className="text-muted-foreground">Starting session...</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const currentItem = items[currentIndex];
  if (!currentItem) {
    return null; // Guard for undefined
  }
  const progress = ((currentIndex + 1) / items.length) * 100;
  const accuracy = calculateAccuracy();

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold font-mono">
                    {calculateElapsedTime()}
                  </p>
                  <p className="text-xs text-muted-foreground">Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">
                    {currentIndex + 1}/{items.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    <AnimatedCounter value={itemsCorrect} />
                  </p>
                  <p className="text-xs text-muted-foreground">Correct</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    <AnimatedCounter value={accuracy} decimals={0} suffix="%" />
                  </p>
                  <p className="text-xs text-muted-foreground">Accuracy</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Item {currentIndex + 1} of {items.length}
              </span>
              <span className="font-medium">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Current Item */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="min-h-[400px]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle>Study Item {currentIndex + 1}</CardTitle>
                  <Badge variant="outline" className="capitalize">
                    {currentItem.type}
                  </Badge>
                  {flaggedItems.has(currentIndex) && (
                    <Badge
                      variant="outline"
                      className="bg-yellow-50 border-yellow-300 text-yellow-700"
                    >
                      <Flag className="h-3 w-3 mr-1 fill-yellow-500" />
                      Flagged
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleFlag(currentIndex)}
                >
                  <Flag
                    className={cn(
                      "h-4 w-4",
                      flaggedItems.has(currentIndex) &&
                      "fill-yellow-500 text-yellow-500",
                    )}
                  />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Item Content */}
              <div className="min-h-[200px] flex items-center justify-center p-8">
                {currentItem.type === "flashcard" ? (
                  <div className="text-center space-y-4 w-full">
                    {!showingAnswer ? (
                      // Front of flashcard
                      <motion.div
                        initial={{ rotateY: 90 }}
                        animate={{ rotateY: 0 }}
                        className="space-y-4"
                      >
                        <p className="text-3xl font-medium">
                          {currentItem.data.front_text ||
                            currentItem.data.title ||
                            "Flashcard Front"}
                        </p>
                        {currentItem.data.deck_name && (
                          <Badge variant="outline">
                            {currentItem.data.deck_name}
                          </Badge>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Press{" "}
                          <kbd className="px-2 py-1 bg-muted rounded">
                            Space
                          </kbd>{" "}
                          to reveal answer
                        </p>
                      </motion.div>
                    ) : (
                      // Back of flashcard
                      <motion.div
                        initial={{ rotateY: -90 }}
                        animate={{ rotateY: 0 }}
                        className="space-y-4"
                      >
                        <p className="text-2xl font-medium text-primary">
                          {currentItem.data.back_text || "Flashcard Back"}
                        </p>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  // Quiz or other item types
                  <div className="text-center space-y-4 w-full">
                    <p className="text-2xl font-medium">
                      {currentItem.data.title ||
                        currentItem.data.question_text ||
                        currentItem.data.front_text ||
                        "Study Item"}
                    </p>
                    {currentItem.data.deck_name && (
                      <Badge variant="outline">
                        {currentItem.data.deck_name}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                {currentItem.type === "flashcard" && !showingAnswer ? (
                  <Button
                    size="lg"
                    onClick={() => setShowingAnswer(true)}
                    className="w-full"
                  >
                    Show Answer <span className="ml-2 text-xs">(Space)</span>
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handleItemComplete(false)}
                      className="border-red-200 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <XCircle className="h-4 w-4 mr-2 text-red-600" />
                      Need Practice <span className="ml-1 text-xs">(1)</span>
                    </Button>
                    <Button
                      size="lg"
                      onClick={() => handleItemComplete(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Got It! <span className="ml-1 text-xs">(2)</span>
                    </Button>
                  </div>
                )}

                <div className="flex justify-between gap-2">
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    disabled={currentIndex === items.length - 1}
                  >
                    <SkipForward className="h-4 w-4 mr-2" />
                    Skip
                  </Button>
                  {onCancel && (
                    <Button
                      variant="outline"
                      onClick={() => setShowEndConfirm(true)}
                    >
                      End Session Early
                    </Button>
                  )}
                </div>
              </div>

              {/* Keyboard Shortcuts Hint */}
              <div className="text-center text-xs text-muted-foreground pt-4 border-t">
                <p>
                  Keyboard: <kbd className="px-1 bg-muted rounded">Space</kbd>{" "}
                  flip · <kbd className="px-1 bg-muted rounded">1</kbd> need
                  practice · <kbd className="px-1 bg-muted rounded">2</kbd> got
                  it · <kbd className="px-1 bg-muted rounded">F</kbd> flag
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* End Session Confirmation */}
      <ConfirmationModal
        open={showEndConfirm}
        onOpenChange={setShowEndConfirm}
        onConfirm={handleEndSession}
        title="End Session Early?"
        description={`You've completed ${itemsCompleted} out of ${items.length} items. End session now?`}
        confirmLabel="End Session"
        cancelLabel="Continue"
      />
    </div>
  );
}
