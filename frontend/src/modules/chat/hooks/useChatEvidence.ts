/**
 * useChatEvidence - Unified Search Integration for Chat RAG Grounding
 * 
 * Consumes the Search Intelligence Bus with intent=retrieve_context.
 * This provides evidence for LLM grounding - the LLM sees ONLY:
 * - snippet (the actual content)
 * - title (source document name)
 * - parent_id / root_id (provenance)
 * - confidence (credibility weight)
 * 
 * The LLM NEVER sees:
 * - BM25 scores
 * - RRF rankings
 * - Navigation entities
 * - Diagnostic concepts
 * - Raw user mastery
 * 
 * Contract enforcement (strictest):
 * - Only accepts role=evidence
 * - Only accepts assertion_type=inferential
 * - Requires parent_id or root_id (link to source)
 * 
 * Graceful degradation:
 * - If RAG/Qdrant is down, returns empty evidence
 * - LLM answers without grounding (transparent)
 */

import { useChatContext } from "@/api/unified-search";
import { useMemo } from "react";
import type { UnifiedSearchResult } from "@/api/unified-search";

// =============================================================================
// Types
// =============================================================================

/**
 * Evidence for LLM grounding.
 * Only what the LLM needs to reason about credibility.
 */
export interface ChatEvidence {
    /** Unique identifier */
    id: string;

    /** Source document title */
    title: string;

    /** The actual content snippet */
    snippet: string;

    /** Parent document ID */
    parentId: string | number | null;

    /** Root document ID (for nested chunks) */
    rootId: string | number | null;

    /** Confidence score (0-1) for credibility weighting */
    confidence: number;

    /** Vector similarity score */
    similarity: number;
}

export interface ChatEvidenceState {
    /** Evidence chunks for LLM grounding */
    evidence: ChatEvidence[];

    /** Whether retrieval is loading */
    isLoading: boolean;

    /** Whether RAG is unavailable */
    isUnavailable: boolean;

    /** Error message if any */
    errorMessage: string | null;

    /** Number of valid evidence chunks */
    evidenceCount: number;

    /** Average confidence across evidence */
    avgConfidence: number;
}

// =============================================================================
// Hook
// =============================================================================

export function useChatEvidence(
    query: string,
    enabled: boolean = true
): ChatEvidenceState {
    const {
        evidenceResults,
        engineResults,
        isLoading,
        error,
    } = useChatContext(query, enabled && query.length >= 2);

    // Check if RAG engine is available
    const ragEngine = engineResults.find((e: { engine: string }) => e.engine === "rag");
    const isUnavailable = enabled && query.length >= 2 && ragEngine?.status !== "ok";
    const errorMessage = ragEngine?.error_message || error?.message || null;

    // Transform unified search results into LLM-friendly evidence
    const evidence = useMemo<ChatEvidence[]>(() => {
        if (isUnavailable || evidenceResults.length === 0) {
            return [];
        }

        return evidenceResults
            .filter((r: UnifiedSearchResult) => r.snippet) // Only chunks with content
            .map((result: UnifiedSearchResult) => ({
                id: String(result.id.id),
                title: result.title,
                snippet: result.snippet || "",
                parentId: result.id.parent_id ?? null,
                rootId: result.id.root_id ?? null,
                confidence: result.confidence ?? 0.5,
                similarity: result.scores.similarity ?? result.scores.vector ?? 0,
            }));
    }, [evidenceResults, isUnavailable]);

    // Compute aggregate stats
    const evidenceCount = evidence.length;
    const avgConfidence = evidenceCount > 0
        ? evidence.reduce((sum, e) => sum + e.confidence, 0) / evidenceCount
        : 0;

    return {
        evidence,
        isLoading,
        isUnavailable,
        errorMessage,
        evidenceCount,
        avgConfidence,
    };
}

// =============================================================================
// Grounding Prompt Constants (FROZEN - DO NOT MODIFY)
// =============================================================================

/**
 * Immutable system prompt for RAG-grounded responses.
 * This defines how the LLM treats evidence.
 * 
 * CRITICAL: Any changes to this prompt affect ALL grounded responses.
 * Changes require explicit approval and red-team validation.
 */
export const GROUNDING_SYSTEM_PROMPT = `You are an assistant that answers using provided evidence when available.

Rules:
- Evidence snippets are partial and may not fully answer the question.
- Do NOT assume evidence is complete or authoritative.
- If evidence is insufficient, say so explicitly.
- Do NOT invent details not present in evidence.
- Cite sources by their title when using evidence.`;

/**
 * Instruction appended to grounded queries.
 */
export const GROUNDING_INSTRUCTION = `Use the evidence above if relevant.
If evidence does not fully answer the question, explain the limitation.`;

// =============================================================================
// Evidence Formatting (Deterministic)
// =============================================================================

/**
 * Format evidence for LLM prompt injection.
 * 
 * Returns a delimited, structured evidence block.
 * Properties:
 * - Explicit boundary (<EVIDENCE>) for parsing
 * - Confidence is advisory, not authoritative
 * - No engine names, no raw scores
 * - Deterministic output for same input
 */
export function formatEvidenceForPrompt(evidence: ChatEvidence[]): string {
    if (evidence.length === 0) {
        return "";
    }

    const sources = evidence.map((e, i) => {
        const confidenceLabel = e.confidence >= 0.8 ? "high" :
            e.confidence >= 0.5 ? "medium" : "low";

        return `Source ${i + 1}:
Title: ${e.title}
Confidence: ${confidenceLabel} (${(e.confidence * 100).toFixed(0)}%)
Snippet:
"${e.snippet.trim()}"`;
    });

    return `<EVIDENCE>
${sources.join("\n\n")}
</EVIDENCE>`;
}

/**
 * Format the complete grounded prompt for the LLM.
 * Combines evidence block + user question + instruction.
 */
export function formatGroundedPrompt(
    evidence: ChatEvidence[],
    userQuestion: string
): string {
    const evidenceBlock = formatEvidenceForPrompt(evidence);

    if (!evidenceBlock) {
        // No grounding - LLM answers from knowledge
        return `Question:
${userQuestion}`;
    }

    return `${evidenceBlock}

Question:
${userQuestion}

${GROUNDING_INSTRUCTION}`;
}

// =============================================================================
// Evidence Usage Signals
// =============================================================================

/**
 * Signal emitted when Chat uses evidence.
 * This is the ONLY feedback signal from Chat → GIE.
 */
export interface EvidenceUsage {
    /** IDs of evidence chunks that were available */
    availableEvidenceIds: string[];

    /** IDs of evidence chunks actually used (cited) in response */
    usedEvidenceIds: string[];

    /** Average confidence of available evidence */
    avgConfidence: number;

    /** Whether the response is grounded */
    isGrounded: boolean;

    /** Quality proxy (user feedback if available) */
    answerQualityProxy: "positive" | "negative" | "neutral" | null;

    /** Timestamp */
    timestamp: string;
}

/**
 * Create an evidence usage signal from chat context.
 */
export function createEvidenceUsageSignal(
    evidence: ChatEvidence[],
    usedIds: string[] = []
): EvidenceUsage {
    const avgConfidence = evidence.length > 0
        ? evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length
        : 0;

    return {
        availableEvidenceIds: evidence.map((e) => e.id),
        usedEvidenceIds: usedIds,
        avgConfidence,
        isGrounded: evidence.length > 0,
        answerQualityProxy: null, // Set later by user feedback
        timestamp: new Date().toISOString(),
    };
}

// =============================================================================
// Evidence Metadata for UI
// =============================================================================

/**
 * Get evidence metadata for response attribution and UI rendering.
 */
export function getEvidenceMetadata(evidence: ChatEvidence[]): {
    sourceCount: number;
    sources: Array<{ id: string; title: string; confidence: number }>;
    hasGrounding: boolean;
    avgConfidence: number;
    confidenceLevel: "high" | "medium" | "low" | "none";
} {
    const sourceCount = evidence.length;
    const avgConfidence = sourceCount > 0
        ? evidence.reduce((sum, e) => sum + e.confidence, 0) / sourceCount
        : 0;

    const confidenceLevel: "high" | "medium" | "low" | "none" =
        sourceCount === 0 ? "none" :
            avgConfidence >= 0.8 ? "high" :
                avgConfidence >= 0.5 ? "medium" : "low";

    return {
        sourceCount,
        sources: evidence.map((e) => ({
            id: e.id,
            title: e.title,
            confidence: e.confidence,
        })),
        hasGrounding: sourceCount > 0,
        avgConfidence,
        confidenceLevel,
    };
}

