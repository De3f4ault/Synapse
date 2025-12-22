// Study hooks using TanStack Query
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StudyService } from "../generated";
import type {
  StudyItemResponse,
  StudySessionResponse,
  StudySessionCreate,
} from "../generated";

const STUDY_KEYS = {
  all: ["study"] as const,
  due: () => [...STUDY_KEYS.all, "due"] as const,
  recommendations: () => [...STUDY_KEYS.all, "recommendations"] as const,
  sessions: () => [...STUDY_KEYS.all, "sessions"] as const,
  session: (id: number) => [...STUDY_KEYS.all, "session", id] as const,
};

/**
 * Hook to get due items across modules
 */
export const useDueItems = (params?: { modules?: string; limit?: number }) => {
  return useQuery<StudyItemResponse[]>({
    queryKey: STUDY_KEYS.due(),
    queryFn: () =>
      StudyService.getDueItemsApiV1StudyDueGet(params?.modules, params?.limit),
  });
};

/**
 * Hook to get AI-powered study recommendations
 */
export const useStudyRecommendations = (limit?: number) => {
  return useQuery<StudyItemResponse[]>({
    queryKey: STUDY_KEYS.recommendations(),
    queryFn: () =>
      StudyService.getRecommendationsApiV1StudyRecommendationsGet(limit),
  });
};

/**
 * Hook to list study sessions
 */
export const useStudySessions = (params?: {
  page?: number;
  pageSize?: number;
}) => {
  return useQuery<StudySessionResponse[]>({
    queryKey: STUDY_KEYS.sessions(),
    queryFn: () =>
      StudyService.listSessionsApiV1StudySessionsGet(
        params?.page,
        params?.pageSize,
      ),
  });
};

/**
 * Hook to get a specific study session
 */
export const useStudySession = (sessionId: number) => {
  return useQuery<StudySessionResponse>({
    queryKey: STUDY_KEYS.session(sessionId),
    queryFn: () =>
      StudyService.getSessionApiV1StudySessionsSessionIdGet(sessionId),
    enabled: !!sessionId,
  });
};

/**
 * Hook to start a new study session
 */
export const useStartStudySession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: StudySessionCreate) =>
      StudyService.startSessionApiV1StudySessionsPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDY_KEYS.sessions() });
    },
  });
};

/**
 * Hook to complete a study session
 */
export const useCompleteStudySession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: number) =>
      StudyService.completeSessionApiV1StudySessionsSessionIdCompletePost(
        sessionId,
      ),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: STUDY_KEYS.sessions() });
      queryClient.invalidateQueries({
        queryKey: STUDY_KEYS.session(sessionId),
      });
      queryClient.invalidateQueries({ queryKey: STUDY_KEYS.all });
    },
  });
};
