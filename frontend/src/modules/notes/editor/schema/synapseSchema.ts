import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
} from "@blocknote/core";
import { AlertBlock } from "../blocks/AlertBlock";
import { ToggleBlock } from "../blocks/ToggleBlock";
import { FlashcardBlock } from "../blocks/FlashcardBlock";
import { QuizBlock } from "../blocks/QuizBlock";
import { Mention } from "../inline/Mention";

/**
 * Synapse Custom BlockNote Schema
 * Extends the default schema with our custom learning blocks and inline content.
 */
export const synapseSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    alert: AlertBlock(),
    toggle: ToggleBlock(),
    flashcard: FlashcardBlock(),
    quiz: QuizBlock(),
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    mention: Mention,
  },
});

// Export types derived from our specific schema
export type SynapseBlockNoteSchema = typeof synapseSchema;
// BlockNoteSchema exports types slightly differently in recent versions
// We should infer them from the schema instance if standard property access fails
// or check if we even need to export them explicitly if we use `typeof synapseSchema` elsewhere.
export type SynapseBlock = typeof synapseSchema.Block;
// If InlineContent is missing, it might be named differently or accessed via helper
// Let's comment out the problematic export if unsure, or try to find the right property.
// In v0.15+, it is usually just `InlineContent`.
// If the linter says it's missing, let's remove it for now and rely on inference.
// export type SynapseInlineContent = typeof synapseSchema.InlineContent; // Removed to fix error
