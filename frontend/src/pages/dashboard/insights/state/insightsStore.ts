/**
 * Insights Store - Computed insights cache
 * 
 * IMPORTANT: The engine is the authority.
 * This store caches computed insights to prevent recomputation.
 * 
 * Store responsibilities:
 * - Cache computed insights
 * - Track loading/error state
 * - Invalidate on context change
 * 
 * Store does NOT decide what insights exist - that's the engine's job.
 */

import { create } from "zustand";
import type {
    WeakAreaInsight,
    NextActionRecommendation,
    MilestoneAchievement,
    IntelligenceInsight,
} from "../engine";

// ============================================================
// State Types
// ============================================================

interface InsightsState {
    // Cached computed insights
    weakAreas: WeakAreaInsight[];
    nextAction: NextActionRecommendation | null;
    milestones: MilestoneAchievement[];
    contextInsights: IntelligenceInsight[];

    // Loading state
    isComputing: boolean;
    lastComputedAt: number | null;

    // Error state
    error: Error | null;
}

interface InsightsActions {
    // Cache setters (called by hook after engine computation)
    setWeakAreas: (weakAreas: WeakAreaInsight[]) => void;
    setNextAction: (action: NextActionRecommendation | null) => void;
    setMilestones: (milestones: MilestoneAchievement[]) => void;
    setContextInsights: (insights: IntelligenceInsight[]) => void;
    setAll: (insights: {
        weakAreas: WeakAreaInsight[];
        nextAction: NextActionRecommendation | null;
        milestones: MilestoneAchievement[];
        contextInsights: IntelligenceInsight[];
    }) => void;

    // Loading/error
    setComputing: (value: boolean) => void;
    setError: (error: Error | null) => void;

    // Invalidation
    invalidate: () => void;
}

// ============================================================
// Initial State
// ============================================================

const initialState: InsightsState = {
    weakAreas: [],
    nextAction: null,
    milestones: [],
    contextInsights: [],
    isComputing: false,
    lastComputedAt: null,
    error: null,
};

// ============================================================
// Store
// ============================================================

export const useInsightsStore = create<InsightsState & InsightsActions>((set) => ({
    ...initialState,

    // Cache setters
    setWeakAreas: (weakAreas) => set({ weakAreas }),
    setNextAction: (nextAction) => set({ nextAction }),
    setMilestones: (milestones) => set({ milestones }),
    setContextInsights: (contextInsights) => set({ contextInsights }),
    setAll: ({ weakAreas, nextAction, milestones, contextInsights }) =>
        set({
            weakAreas,
            nextAction,
            milestones,
            contextInsights,
            lastComputedAt: Date.now(),
            isComputing: false,
        }),

    // Loading/error
    setComputing: (isComputing) => set({ isComputing }),
    setError: (error) => set({ error, isComputing: false }),

    // Invalidation (forces recomputation)
    invalidate: () => set({ lastComputedAt: null }),
}));

// ============================================================
// Selectors
// ============================================================

export const useWeakAreas = () => useInsightsStore((s) => s.weakAreas);
export const useNextAction = () => useInsightsStore((s) => s.nextAction);
export const useMilestones = () => useInsightsStore((s) => s.milestones);
export const useContextInsights = () => useInsightsStore((s) => s.contextInsights);
export const useInsightsComputing = () => useInsightsStore((s) => s.isComputing);
export const useInsightsError = () => useInsightsStore((s) => s.error);

// Actions selector
// Actions selector
export const useInsightsActions = () => {
    const s = useInsightsStore.getState();
    return {
        setAll: s.setAll,
        setComputing: s.setComputing,
        setError: s.setError,
        invalidate: s.invalidate,
    };
};
