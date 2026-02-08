/**
 * Artifact Types - Shared type definitions for artifacts module
 * 
 * INVARIANT: Artifacts are first-class structured outputs.
 * INVARIANT: Phase 1 supports code only. Phase 2+ adds react, html, etc.
 */

// Re-export from schema for convenience
export type { ArtifactBlock, ArtifactType } from '@/shared/rendering/schema';

/**
 * Artifact state for UI display.
 */
export type ArtifactState = 'creating' | 'streaming' | 'ready' | 'error';

/**
 * Artifact metadata for persistence (Phase 1B).
 */
export interface ArtifactMeta {
    id: string;
    slug: string;
    sessionId: number;
    messageId?: number;
    title: string;
    type: string;
    language?: string;
    version: number;
    state: ArtifactState;
    createdAt: string;
    updatedAt: string;
}

/**
 * Full artifact with content for rendering.
 */
export interface Artifact extends ArtifactMeta {
    content: string;
    filename?: string;
}

/**
 * Thresholds for artifact detection.
 * Based on Claude's approach (content >15 lines or React/HTML).
 */
export const ARTIFACT_THRESHOLDS = {
    /** Minimum lines to elevate code to artifact */
    MIN_LINES: 15,
    /** Languages that always become artifacts */
    ALWAYS_ARTIFACT_LANGUAGES: ['tsx', 'jsx', 'react'],
    /** Languages that become artifacts if they have HTML structure */
    HTML_LANGUAGES: ['html', 'htm'],
    /** Maximum content size in bytes */
    MAX_CONTENT_SIZE: 1_000_000,
} as const;

/**
 * Supported artifact MIME types (Claude's format).
 */
export const ARTIFACT_MIME_TYPES = {
    CODE: 'application/vnd.ant.code',
    REACT: 'application/vnd.ant.react',
    HTML: 'text/html',
    MARKDOWN: 'text/markdown',
    SVG: 'image/svg+xml',
    MERMAID: 'application/vnd.ant.mermaid',
} as const;
