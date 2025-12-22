import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { StudyService } from "@/api/generated";
import { QUERY_KEYS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import type { StudySessionCreate, StudySessionResponse } from "@/api/generated";

/**
 * Hook for managing study sessions
 * Handles session lifecycle and statistics tracking
 */

interface UseStudySessionOptions {
  onComplete?: (session: StudySessionResponse) => void;
}

interface ItemState {
  id: number;
  isCompleted: boolean;
  isCorrect: boolean;
}

interface LocalSessionState {
  sessionId: number | null;
  config: StudySessionCreate | null;
  currentItemIndex: number;
  completedItems: ItemState[];
  startTime: Date | null;
  stats: {
    totalItems: number;
    completedItems: number;
    correctItems: number;
    accuracy: number;
    timeSpent: number;
    averageTimePerItem: number;
  };
}

export function useStudySession(options: UseStudySessionOptions = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Internal state to track the active session
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionState, setSessionState] = useState<LocalSessionState>({
    sessionId: null,
    config: null,
    currentItemIndex: 0,
    completedItems: [],
    startTime: null,
    stats: {
      totalItems: 0,
      completedItems: 0,
      correctItems: 0,
      accuracy: 0,
      timeSpent: 0,
      averageTimePerItem: 0,
    },
  });

  // Start session mutation
  const { mutate: startSession, isPending: isStarting } = useMutation({
    mutationFn: async (config: StudySessionCreate) => {
      const response =
        await StudyService.startSessionApiV1StudySessionsPost(config);
      return { response, config };
    },
    onSuccess: ({ response, config }) => {
      setSessionId(response.id);
      // Initialize local state
      setSessionState({
        sessionId: response.id,
        config: config,
        currentItemIndex: 0,
        completedItems: [],
        startTime: new Date(),
        stats: {
          totalItems: config.modules?.length ?? 0,
          completedItems: 0,
          correctItems: 0,
          accuracy: 0,
          timeSpent: 0,
          averageTimePerItem: 0,
        },
      });

      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDY] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Start Session",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Complete session mutation
  const { mutate: completeSession, isPending: isCompleting } = useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error("No active session");
      const response =
        await StudyService.completeSessionApiV1StudySessionsSessionIdCompletePost(
          sessionId,
        );
      return response;
    },
    onSuccess: (result) => {
      const minutes = Math.floor(result.time_spent_seconds / 60);
      const accuracy = (result.accuracy * 100).toFixed(1);

      toast({
        title: "Session Complete!",
        description: `${result.items_completed} items in ${minutes}m · ${accuracy}% accuracy`,
      });

      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDY] });
      options.onComplete?.(result);

      // Reset local state
      setSessionId(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to Complete Session",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Calculate session statistics
  const calculateStats = (session: StudySessionResponse) => {
    const timeSpent = session.time_spent_seconds;
    const itemsCompleted = session.items_completed;
    const accuracyVal = session.accuracy;

    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;
    const timeFormatted = `${minutes}m ${seconds}s`;

    const itemsPerMinute =
      minutes > 0 ? (itemsCompleted / minutes).toFixed(1) : "0";

    const accuracyPercent = (accuracyVal * 100).toFixed(1);

    return {
      timeFormatted,
      itemsPerMinute,
      accuracyPercent,
      isGoodAccuracy: accuracyVal >= 0.8,
      isExcellentAccuracy: accuracyVal >= 0.9,
    };
  };

  return {
    startSession,
    completeSession,
    isStarting,
    isCompleting,
    calculateStats,
    sessionState,
  };
}
