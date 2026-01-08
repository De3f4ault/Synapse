/**
 * computeWeakAreas - Pure function to analyze weak areas
 * 
 * Input: Raw weak areas from API + priority calculator
 * Output: Enhanced weak area insights with severity and suggestions
 * 
 * NO SIDE EFFECTS - pure transformation.
 */

import type { WeakArea } from "@/api/generated";
import type { WeakAreaInsight, SeverityLevel, TrendDirection } from "./types";

interface PriorityInput {
    dueDate: string | null;
    isWeakArea: boolean;
    accuracy: number;
    hasPrerequisites: boolean;
    lastAccessed: string | null;
}

/**
 * Calculate priority score for an item (0-1)
 */
export function calculatePriority(input: PriorityInput): number {
    let score = 0.5; // Base score

    // Due date urgency
    if (input.dueDate) {
        const dueDate = new Date(input.dueDate);
        const now = new Date();
        const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilDue < 0) score += 0.3; // Overdue
        else if (hoursUntilDue < 24) score += 0.2; // Due today
        else if (hoursUntilDue < 72) score += 0.1; // Due soon
    }

    // Weak area boost
    if (input.isWeakArea) {
        score += 0.2;
    }

    // Accuracy penalty/boost
    if (input.accuracy < 0.5) score += 0.15;
    else if (input.accuracy < 0.7) score += 0.05;
    else if (input.accuracy > 0.9) score -= 0.1;

    // Prerequisites penalty (blocks other learning)
    if (input.hasPrerequisites) score += 0.1;

    // Recency bonus (recently accessed items slightly lower priority)
    if (input.lastAccessed) {
        const lastAccessed = new Date(input.lastAccessed);
        const hoursSinceAccess = (Date.now() - lastAccessed.getTime()) / (1000 * 60 * 60);
        if (hoursSinceAccess > 168) score += 0.05; // More than a week
    }

    return Math.min(1, Math.max(0, score));
}

/**
 * Determine severity level based on accuracy
 */
function determineSeverity(accuracy: number): SeverityLevel {
    if (accuracy < 0.4) return "critical";
    if (accuracy < 0.55) return "high";
    if (accuracy < 0.7) return "medium";
    return "low";
}

/**
 * Generate actionable suggestion for weak area
 */
function generateSuggestion(accuracy: number): string {
    if (accuracy < 0.4) {
        return "Critical: Review fundamentals with focused study session";
    } else if (accuracy < 0.55) {
        return "High priority: Practice with spaced repetition";
    } else if (accuracy < 0.7) {
        return "Moderate: Regular review recommended";
    }
    return "Continue practicing to maintain mastery";
}

/**
 * Detect trend based on accuracy and review count
 */
function detectTrend(accuracy: number, reviewCount: number): TrendDirection | null {
    if (reviewCount <= 5) return null; // Not enough data

    if (accuracy > 0.65 && reviewCount > 10) return "improving";
    if (accuracy < 0.5) return "declining";
    return "stable";
}

/**
 * Compute enhanced weak area insights from raw API data
 */
export function computeWeakAreas(weakAreas: WeakArea[] | undefined): WeakAreaInsight[] {
    if (!weakAreas || !Array.isArray(weakAreas)) {
        return [];
    }

    return weakAreas
        .map((area) => {
            const accuracy = area.accuracy || 0;
            const reviewCount = area.review_count || 0;

            const priority = calculatePriority({
                dueDate: null,
                isWeakArea: true,
                accuracy,
                hasPrerequisites: false,
                lastAccessed: null,
            });

            return {
                ...area,
                priority,
                severity: determineSeverity(accuracy),
                suggestion: generateSuggestion(accuracy),
                trend: detectTrend(accuracy, reviewCount),
                source: "api" as const,
                detectedAt: new Date().toISOString(),
            };
        })
        .sort((a, b) => b.priority - a.priority);
}

/**
 * Merge API weak areas with graph-detected weak areas.
 *
 * Rules:
 * 1. Same topic → merge into 'hybrid' (highest confidence)
 * 2. Graph weakness overrides API severity when both exist
 * 3. Sort by severity desc, then recency
 */
export function mergeWeakAreas(
    apiWeakAreas: WeakAreaInsight[],
    graphWeakAreas: Array<{
        topic: string;
        accuracy: number;
        review_count: number;
        source: "graph";
        graphStrength: number;
        detectedAt: string;
        lastReinforcedAt?: string;
    }>
): WeakAreaInsight[] {
    // Create map of API areas by topic for quick lookup
    const apiMap = new Map<string, WeakAreaInsight>();
    for (const area of apiWeakAreas) {
        apiMap.set(area.topic.toLowerCase(), area);
    }

    // Merged results
    const merged: WeakAreaInsight[] = [];
    const processedTopics = new Set<string>();

    // Process graph areas first (they have priority)
    for (const graphArea of graphWeakAreas) {
        const topicKey = graphArea.topic.toLowerCase();
        const apiArea = apiMap.get(topicKey);
        processedTopics.add(topicKey);

        if (apiArea) {
            // HYBRID: Graph overrides severity when both exist
            merged.push({
                ...apiArea,
                source: "hybrid",
                graphStrength: graphArea.graphStrength,
                detectedAt: graphArea.detectedAt,
                lastReinforcedAt: graphArea.lastReinforcedAt,
                // Use lower accuracy (more severe) from either source
                accuracy: Math.min(apiArea.accuracy, graphArea.accuracy),
                priority: apiArea.priority + 0.1, // Boost hybrid priority
                suggestion: "Confirmed by both historical data and recent learning",
            });
        } else {
            // Graph-only area
            const priority = calculatePriority({
                dueDate: null,
                isWeakArea: true,
                accuracy: graphArea.graphStrength,
                hasPrerequisites: false,
                lastAccessed: graphArea.lastReinforcedAt || null,
            });

            merged.push({
                topic: graphArea.topic,
                accuracy: graphArea.accuracy,
                review_count: graphArea.review_count,
                priority,
                severity: determineSeverity(graphArea.graphStrength),
                suggestion: "From long-term learning patterns",
                trend: null,
                source: "graph",
                graphStrength: graphArea.graphStrength,
                detectedAt: graphArea.detectedAt,
                lastReinforcedAt: graphArea.lastReinforcedAt,
            });
        }
    }

    // Add remaining API-only areas
    for (const apiArea of apiWeakAreas) {
        const topicKey = apiArea.topic.toLowerCase();
        if (!processedTopics.has(topicKey)) {
            merged.push({
                ...apiArea,
                suggestion: "From your recent answers",
            });
        }
    }

    // Sort by priority (desc), then by recency
    return merged.sort((a, b) => {
        if (b.priority !== a.priority) {
            return b.priority - a.priority;
        }
        // Secondary sort by recency
        const aTime = a.lastReinforcedAt ? new Date(a.lastReinforcedAt).getTime() : 0;
        const bTime = b.lastReinforcedAt ? new Date(b.lastReinforcedAt).getTime() : 0;
        return bTime - aTime;
    });
}

/**
 * Merge GIE (Graph Intelligence Engine) weak areas into existing weak areas.
 *
 * GIE provides:
 * - mastery (0-1)
 * - stability (0-1, lower = at risk)
 * - weakness_evidence (reasons)
 *
 * Rules:
 * 1. GIE source has highest authority for identified concepts
 * 2. If topic exists in other sources, create hybrid
 * 3. Include stability for decay risk indication
 */
export function mergeGIEWeakAreas(
    existingWeakAreas: WeakAreaInsight[],
    gieWeakConcepts: Array<{
        concept_id: string;
        concept_name?: string;
        mastery: number;
        stability: number;
        last_reinforced_at?: string;
        weakness_evidence?: Array<{ reason: string }>;
    }>,
    gieFragileConcepts: Array<{
        concept_id: string;
        concept_name?: string;
        mastery: number;
        stability: number;
        last_reinforced_at?: string;
    }>
): WeakAreaInsight[] {
    // Create map for existing areas
    const existingMap = new Map<string, WeakAreaInsight>();
    for (const area of existingWeakAreas) {
        existingMap.set(area.topic.toLowerCase(), area);
    }

    const merged: WeakAreaInsight[] = [];
    const processedTopics = new Set<string>();

    // Process GIE weak concepts (highest priority)
    for (const concept of gieWeakConcepts) {
        const topicKey = concept.concept_id.toLowerCase();
        const existing = existingMap.get(topicKey);
        processedTopics.add(topicKey);

        const priority = calculatePriority({
            dueDate: null,
            isWeakArea: true,
            accuracy: concept.mastery,
            hasPrerequisites: false,
            lastAccessed: concept.last_reinforced_at || null,
        });

        const reason = concept.weakness_evidence?.[0]?.reason || "Low mastery detected";

        if (existing) {
            // Hybrid: GIE confirms existing weakness
            merged.push({
                ...existing,
                source: "hybrid",
                stability: concept.stability,
                accuracy: Math.min(existing.accuracy, concept.mastery),
                priority: priority + 0.15,
                suggestion: reason,
                lastReinforcedAt: concept.last_reinforced_at,
            });
        } else {
            // GIE-only weak concept
            merged.push({
                topic: concept.concept_name || concept.concept_id,
                accuracy: concept.mastery,
                review_count: 0,
                priority,
                severity: determineSeverity(concept.mastery),
                suggestion: reason,
                trend: null,
                source: "gie",
                stability: concept.stability,
                lastReinforcedAt: concept.last_reinforced_at,
            });
        }
    }

    // Process GIE fragile concepts (at risk, not yet weak)
    for (const concept of gieFragileConcepts) {
        const topicKey = concept.concept_id.toLowerCase();
        if (processedTopics.has(topicKey)) continue;

        const existing = existingMap.get(topicKey);
        processedTopics.add(topicKey);

        const priority = calculatePriority({
            dueDate: null,
            isWeakArea: true,
            accuracy: concept.mastery,
            hasPrerequisites: false,
            lastAccessed: concept.last_reinforced_at || null,
        });

        if (existing) {
            merged.push({
                ...existing,
                source: "hybrid",
                stability: concept.stability,
                priority: priority + 0.05,
                suggestion: "At risk of being forgotten",
                lastReinforcedAt: concept.last_reinforced_at,
            });
        } else {
            merged.push({
                topic: concept.concept_name || concept.concept_id,
                accuracy: concept.mastery,
                review_count: 0,
                priority: priority - 0.1, // Lower than weak, but still important
                severity: "low",
                suggestion: "Stability declining — reinforce soon",
                trend: "declining",
                source: "gie",
                stability: concept.stability,
                lastReinforcedAt: concept.last_reinforced_at,
            });
        }
    }

    // Add remaining areas not in GIE
    for (const area of existingWeakAreas) {
        const topicKey = area.topic.toLowerCase();
        if (!processedTopics.has(topicKey)) {
            merged.push(area);
        }
    }

    // Sort by priority desc
    return merged.sort((a, b) => b.priority - a.priority);
}
