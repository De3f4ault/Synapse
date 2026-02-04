
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { AlertBlock } from "../blocks/AlertBlock";

// Phase 3: "Milk the Marrow" - Start with the official, minimal, correct schema.
// We extend explicitly instead of relying on implicit defaults.

export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    alert: AlertBlock(),
  },
});

// Export the type for use in the editor and hook
export type EditorSchema = typeof schema;
