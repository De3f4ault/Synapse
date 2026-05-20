/**
 * Synapse Chat Data Part Schemas — Vercel AI SDK v6
 *
 * The SDK's `DataUIPart` system lets the backend stream typed structured data
 * alongside text via `data-<type>` SSE events. The frontend declares schemas
 * here, and the SDK validates + types the parts automatically.
 *
 * Usage in useChat:
 *   const { messages } = useChat({ dataPartSchemas: SYNAPSE_DATA_PART_SCHEMAS })
 *
 * Then in rendering:
 *   for (const part of message.parts) {
 *     if (part.type === 'data-artifact')   → part.data is ArtifactDataPart
 *     if (part.type === 'data-mermaid')    → part.data is MermaidDataPart
 *     if (part.type === 'data-routing')    → part.data is RoutingDataPart
 *     if (part.type === 'data-warning')    → part.data is WarningDataPart
 *   }
 *
 * Protocol reference:
 *   Backend emits: { "type": "data-mermaid", "data": { "diagram": "..." } }
 *   SDK wraps:     message.parts.push({ type: 'data-mermaid', data: { diagram: '...' } })
 *
 * Fence interception (handled by backend CodeFenceInterceptor):
 *   ```mermaid → data-mermaid part
 *   ```synapse-flashcards → data-artifact { artifact_type: 'flashcard_set' }
 *   ```synapse-quiz → data-artifact { artifact_type: 'quiz' }
 *
 * This means TextUIPart.text is always clean prose — never contains mermaid/
 * quiz/flashcard syntax. MarkdownRenderer can render it directly.
 */

import { z } from 'zod';
import type { InferUIDataParts } from 'ai';

// ── Mermaid Diagram Part ──────────────────────────────────────────────────────
// Emitted when AI outputs ```mermaid code fences (intercepted by backend)

export const mermaidDataSchema = z.object({
  /** Unique diagram identifier */
  id: z.string(),
  /** Raw mermaid diagram source */
  diagram: z.string(),
});

// ── Artifact Data Part ────────────────────────────────────────────────────────
// Emitted when the AI generates a flashcard set, quiz, code block, or React component

export const artifactDataSchema = z.object({
  /** Unique artifact identifier */
  id: z.string(),
  /** What kind of artifact this is */
  artifact_type: z.enum(['flashcard_set', 'quiz', 'code', 'react', 'html', 'markdown']),
  /** Human-readable title */
  title: z.string().default(''),
  /** Code language (for `code` artifacts) */
  language: z.string().nullish(),
  /** Inline content for small artifacts (code, markdown, html) */
  content: z.string().nullish(),
  /** Structured payload for rich artifacts (flashcards, quiz questions) */
  payload: z.unknown().nullish(),
  /** ID of the persisted artifact record in the DB (for linking/saving) */
  db_id: z.number().nullish(),
  /** Stream state — 'creating'|'streaming'|'ready'|'error' */
  state: z.enum(['creating', 'streaming', 'ready', 'error']).default('ready'),
});

// ── Routing Metadata Part ─────────────────────────────────────────────────────
// Emitted at stream start with agent/model routing decisions

export const routingDataSchema = z.object({
  agent: z.string().nullish(),
  mode: z.string().nullish(),
  model: z.string().nullish(),
  confidence: z.number().nullish(),
  thinking_ui: z.string().nullish(),
});

// ── Warning Part ─────────────────────────────────────────────────────────────
// Emitted when the backend encounters a non-fatal issue

export const warningDataSchema = z.object({
  message: z.string(),
});

// ── Model Upgrade Part ───────────────────────────────────────────────────────
// Emitted when model was auto-upgraded (e.g., image attached → vision model)

export const modelUpgradeDataSchema = z.object({
  original_model: z.string().nullish(),
  upgraded_to: z.string().nullish(),
  reason: z.string().nullish(),
});

// ── Fallback Part ────────────────────────────────────────────────────────────
// Emitted when primary model failed and fallback was used

export const fallbackDataSchema = z.object({
  original_model: z.string().nullish(),
  fallback_model: z.string().nullish(),
  reason: z.string().nullish(),
});

// ── Mention Status Part ───────────────────────────────────────────────────────
// Emitted as the FIRST event when the user's message contains @mentions.
// Tells the frontend which mentions were successfully injected into AI context,
// which failed to resolve (entity not found / wrong user), and which were cut
// due to the token budget being exhausted.
//
// UI contract:
//   - injected entries:            silent (mention chip stays as-is)
//   - resolution_failures entries: chip shows ⚠ "not found" state
//   - budget_overflows entries:    chip shows 📎 "too large" state

const _mentionEntityRef = z.object({
  type: z.string(),
  id: z.number(),
  title: z.string(),
});

export const mentionStatusDataSchema = z.object({
  injected: z.array(_mentionEntityRef).default([]),
  resolution_failures: z.array(_mentionEntityRef).default([]),
  budget_overflows: z.array(_mentionEntityRef).default([]),
});

// ── Aggregated Schema Map ────────────────────────────────────────────────────
// Pass this to useChat({ dataPartSchemas: SYNAPSE_DATA_PART_SCHEMAS })

export const SYNAPSE_DATA_PART_SCHEMAS = {
  mermaid: mermaidDataSchema,
  artifact: artifactDataSchema,
  routing: routingDataSchema,
  warning: warningDataSchema,
  'model-upgrade': modelUpgradeDataSchema,
  fallback: fallbackDataSchema,
  'mention-status': mentionStatusDataSchema,
} as const;

// ── TypeScript types (inferred from schemas) ─────────────────────────────────

export type SynapseDataParts = InferUIDataParts<typeof SYNAPSE_DATA_PART_SCHEMAS>;
export type MermaidDataPart = z.infer<typeof mermaidDataSchema>;
export type ArtifactDataPart = z.infer<typeof artifactDataSchema>;
export type RoutingDataPart = z.infer<typeof routingDataSchema>;
export type WarningDataPart = z.infer<typeof warningDataSchema>;
export type MentionStatusDataPart = z.infer<typeof mentionStatusDataSchema>;
