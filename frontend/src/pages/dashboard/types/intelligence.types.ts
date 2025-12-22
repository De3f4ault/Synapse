import type { WeakArea } from "@/api/generated";
import type { ModuleType } from "./dashboard.types";

/**
 * Intelligence insight types
 * FIXED: Removed incorrect QueueItem import, using proper types
 */

/**
 * Base intelligence insight
 */
export interface IntelligenceInsight {
  id?: string;
  type:
    | "urgency"
    | "pattern"
    | "suggestion"
    | "context"
    | "streak_milestone"
    | "warning"
    | "challenge"
    | "success"
    | "progress"
    | "achievement"
    | "mastery";
  title: string;
  message?: string; // Legacy support
  description?: string;
  confidence?: number; // 0-1
  actionable?: boolean;
  icon?: string;
  action?: {
    label: string;
    url?: string;
  };
  actions?: Array<{
    label: string;
    action: string;
    metadata?: Record<string, unknown>;
  }>;
}

/**
 * Processed weak area with additional context
 */
export interface WeakAreaInsight extends WeakArea {
  priority: number; // 0-1 calculated priority
  severity: "critical" | "high" | "medium" | "low";
  suggestion: string;
  trend?: "improving" | "declining" | "stable" | null;
}

/**
 * Next action recommendation
 */
export interface NextActionRecommendation {
  type: string;
  title: string;
  description: string;
  priority: number; // 0-1
  confidence: number; // 0-1
  estimatedMinutes: number;
  reasoning: string;
  itemCount?: number;
  moduleType: ModuleType;
  actionUrl: string;
  actionData: Record<string, unknown>;
}

/**
 * Milestone achievement
 */
export interface MilestoneAchievement {
  id: string;
  type: "streak" | "mastery" | "volume" | "accuracy" | "productivity";
  title: string;
  description: string;
  icon: string;
  level: "common" | "rare" | "epic" | "legendary";
  timestamp: string;
  value: number;
  metadata: Record<string, unknown>;
}

/**
 * Context insight from backend context engine
 */
export interface ContextInsight {
  type: "weak_area" | "breakthrough" | "pattern" | "recommendation";
  topic: string;
  confidence: number; // 0-1
  message: string;
  relatedResources: Array<{
    type: string;
    id: number;
    title: string;
  }>;
  actionable: boolean;
  action?: {
    type: "deep_dive" | "review" | "explore";
    target: string;
  };
}
