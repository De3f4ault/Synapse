/**
 * suggestNextActions - Pure function to recommend next action
 * 
 * Input: Dashboard data + computed weak areas
 * Output: Single best action recommendation
 * 
 * NO SIDE EFFECTS - pure transformation.
 */

import type { DashboardDataInput, WeakAreaInsight, NextActionRecommendation, ModuleType } from "./types";
import { calculatePriority } from "./computeWeakAreas";

interface ActionCandidate {
    type: string;
    title: string;
    description: string;
    priority: number;
    estimatedMinutes: number;
    itemCount?: number;
    moduleType: ModuleType;
    actionData: Record<string, unknown>;
}

/**
 * Generate action URL from action type and data
 */
function generateActionUrl(type: string, actionData: Record<string, unknown>): string {
    switch (type) {
        case "review_flashcards":
            return "/flashcards/review";
        case "practice_weak_area":
            return `/flashcards/review?topic=${encodeURIComponent(String(actionData.topic))}`;
        case "read_document":
            return `/documents/${actionData.documentId}`;
        case "complete_note":
            return `/notes/${actionData.noteId}`;
        case "take_quiz":
            return `/quizzes/${actionData.quizId}/start`;
        default:
            return "/dashboard";
    }
}

/**
 * Generate reasoning for action recommendation
 */
function generateReasoning(type: string): string {
    switch (type) {
        case "review_flashcards":
            return "These cards are due for review based on spaced repetition schedule";
        case "practice_weak_area":
            return "Your accuracy in this area is below target - focused practice will help";
        case "read_document":
            return "Processing this document will unlock new learning opportunities";
        case "complete_note":
            return "Expanding this note will improve retention and understanding";
        case "take_quiz":
            return "Testing yourself helps identify knowledge gaps";
        default:
            return "Recommended based on your learning patterns";
    }
}

/**
 * Calculate confidence score for action
 */
function calculateConfidence(type: string, itemCount?: number): number {
    if (type === "review_flashcards" && itemCount && itemCount > 0) return 1.0;
    if (type === "practice_weak_area") return 0.85;
    return 0.7;
}

/**
 * Generate all action candidates from dashboard data
 */
function generateCandidates(
    data: DashboardDataInput,
    weakAreas: WeakAreaInsight[]
): ActionCandidate[] {
    const candidates: ActionCandidate[] = [];

    // 1. Due flashcards (highest priority)
    if (data.dueCards && Array.isArray(data.dueCards) && data.dueCards.length > 0) {
        const dueCount = data.dueCards.length;
        const avgAccuracy = data.overview?.overall_accuracy || 0.7;

        candidates.push({
            type: "review_flashcards",
            title: `Review ${dueCount} flashcard${dueCount > 1 ? "s" : ""}`,
            description: `${dueCount} card${dueCount > 1 ? "s are" : " is"} due for review`,
            priority: calculatePriority({
                dueDate: new Date().toISOString(),
                isWeakArea: avgAccuracy < 0.7,
                accuracy: avgAccuracy,
                hasPrerequisites: false,
                lastAccessed: null,
            }),
            estimatedMinutes: Math.ceil(dueCount * 1.5),
            itemCount: dueCount,
            moduleType: "flashcards",
            actionData: { deckId: null, cardCount: dueCount },
        });
    }

    // 2. Weak areas that need attention
    if (weakAreas.length > 0 && weakAreas[0] && weakAreas[0].severity !== "low") {
        const worstArea = weakAreas[0];
        candidates.push({
            type: "practice_weak_area",
            title: `Practice ${worstArea.topic}`,
            description: `Accuracy is ${(worstArea.accuracy * 100).toFixed(0)}% - needs improvement`,
            priority: worstArea.priority,
            estimatedMinutes: 15,
            moduleType: "flashcards",
            actionData: { topic: worstArea.topic, accuracy: worstArea.accuracy },
        });
    }

    // 3. Unread documents
    const unreadDocs = data.documents?.filter(
        (doc) => doc.processing_status === "completed" && !doc.user_id
    ) || [];

    if (unreadDocs.length > 0 && unreadDocs[0]) {
        candidates.push({
            type: "read_document",
            title: `Read ${unreadDocs[0].filename || "Untitled Document"}`,
            description: `${unreadDocs.length} document${unreadDocs.length > 1 ? "s" : ""} waiting to be processed`,
            priority: calculatePriority({
                dueDate: null,
                isWeakArea: false,
                accuracy: 1,
                hasPrerequisites: false,
                lastAccessed: unreadDocs[0].created_at || null,
            }),
            estimatedMinutes: 20,
            itemCount: unreadDocs.length,
            moduleType: "documents",
            actionData: { documentId: unreadDocs[0].id },
        });
    }

    // 4. Incomplete notes
    const incompleteNotes = data.notes?.filter(
        (note) => (note.content?.length || 0) < 200
    ) || [];

    if (incompleteNotes.length > 0 && incompleteNotes[0]) {
        candidates.push({
            type: "complete_note",
            title: `Complete note: ${incompleteNotes[0].title || "Untitled Note"}`,
            description: `${incompleteNotes.length} note${incompleteNotes.length > 1 ? "s need" : " needs"} expansion`,
            priority: 0.5,
            estimatedMinutes: 10,
            itemCount: incompleteNotes.length,
            moduleType: "notes",
            actionData: { noteId: incompleteNotes[0].id },
        });
    }

    // 5. Pending quizzes
    if (data.quizzes && Array.isArray(data.quizzes) && data.quizzes.length > 0) {
        const pendingQuiz = data.quizzes[0];
        if (pendingQuiz) {
            candidates.push({
                type: "take_quiz",
                title: `Take quiz: ${pendingQuiz.title || "Untitled Quiz"}`,
                description: `Test your knowledge with a ${pendingQuiz.difficulty || "medium"} quiz`,
                priority: 0.6,
                estimatedMinutes: pendingQuiz.time_limit_minutes || 15,
                moduleType: "quizzes",
                actionData: { quizId: pendingQuiz.id },
            });
        }
    }

    return candidates;
}

/**
 * Suggest the best next action based on dashboard data
 */
export function suggestNextAction(
    data: DashboardDataInput | undefined,
    weakAreas: WeakAreaInsight[]
): NextActionRecommendation | null {
    if (!data) return null;

    const candidates = generateCandidates(data, weakAreas);

    if (candidates.length === 0) return null;

    // Select highest priority action
    const bestAction = candidates.sort((a, b) => b.priority - a.priority)[0];

    if (!bestAction) return null;

    return {
        type: bestAction.type,
        title: bestAction.title,
        description: bestAction.description,
        priority: bestAction.priority,
        confidence: calculateConfidence(bestAction.type, bestAction.itemCount),
        estimatedMinutes: bestAction.estimatedMinutes,
        reasoning: generateReasoning(bestAction.type),
        itemCount: bestAction.itemCount,
        moduleType: bestAction.moduleType,
        actionUrl: generateActionUrl(bestAction.type, bestAction.actionData),
        actionData: bestAction.actionData,
    };
}
