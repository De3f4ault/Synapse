/**
 * BlockNote Editor Component
 *
 * Core editor wrapper that integrates BlockNote with Synapse's architecture.
 *
 * PRINCIPLE: BlockNote is the engine. Synapse is the skin.
 * This component bridges BlockNote's capabilities with Synapse's identity.
 */

import { useEffect, useMemo, useRef } from "react";
import {
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
  SuggestionMenuController,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";

import { filterSuggestionItems } from "@blocknote/core";
import {
  AlertTriangle,
  WalletCards,
  HelpCircle,
  ToggleLeft,
} from "lucide-react";
import { synapseSchema } from "../schema/synapseSchema";

// Styles
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "../blocks/blocks.css";
import "../theme/synapseBlockNote.css";

// ============================================================================
// Slash Menu Configuration
// ============================================================================

// Editor typed as any to bypass strict schema checks in helper function
const getCustomSlashMenuItems = (editor: any) => {
  const defaultItems = getDefaultReactSlashMenuItems(editor);

  // Custom items
  const alertItem = {
    title: "Alert",
    onItemClick: () => {
      editor.insertBlocks(
        [{ type: "alert", props: { type: "warning" } }],
        editor.getTextCursorPosition().block,
        "after",
      );
    },
    aliases: ["alert", "callout", "warning", "info"],
    group: "Custom",
    icon: <AlertTriangle size={18} />,
    subtext: "Insert an alert block",
  };

  const flashcardItem = {
    title: "Flashcard",
    onItemClick: () => {
      editor.insertBlocks(
        [{ type: "flashcard", props: { front: "Question" } }],
        editor.getTextCursorPosition().block,
        "after",
      );
    },
    aliases: ["flashcard", "card", "study"],
    group: "Learning",
    icon: <WalletCards size={18} />,
    subtext: "Spaced repetition card",
  };

  const quizItem = {
    title: "Quiz Question",
    onItemClick: () => {
      editor.insertBlocks(
        [{ type: "quiz", props: { correctAnswer: "" } }],
        editor.getTextCursorPosition().block,
        "after",
      );
    },
    aliases: ["quiz", "question", "test"],
    group: "Learning",
    icon: <HelpCircle size={18} />,
    subtext: "Inline quiz question",
  };

  const toggleItem = {
    title: "Toggle",
    onItemClick: () => {
      editor.insertBlocks(
        [{ type: "toggle", props: { isOpen: true } }],
        editor.getTextCursorPosition().block,
        "after",
      );
    },
    aliases: ["toggle", "collapse", "fold"],
    group: "Custom",
    icon: <ToggleLeft size={18} />,
    subtext: "Collapsible section",
  };

  return [...defaultItems, alertItem, flashcardItem, quizItem, toggleItem];
};

// ============================================================================
// Types
// ============================================================================

export interface BlockNoteEditorProps {
  /** Initial blocks to render */
  initialBlocks?: any[];
  /** Called when blocks change */
  onChange?: (blocks: any[]) => void;
  /** Whether the editor is editable */
  editable?: boolean;
  /** Placeholder text for empty editor */
  placeholder?: string;
  /** Optional ref to access the editor instance */
  editorRef?: React.MutableRefObject<any | null>;
}

// ============================================================================
// Component
// ============================================================================

import { useUploadFile } from "../hooks/useUploadFile";

// ...

export function BlockNoteEditor({
  initialBlocks,
  onChange,
  editable = true,
  // placeholder is kept in props interface for API compatibility but BlockNote handles it internally
  editorRef,
}: BlockNoteEditorProps) {
  // Track if this is the initial mount to prevent onChange on first render
  const isInitialMount = useRef(true);

  // File upload hook
  const { mutateAsync: uploadFile } = useUploadFile();

  // Create editor instance
  const editor = useCreateBlockNote({
    schema: synapseSchema,
    initialContent: initialBlocks?.length ? initialBlocks : undefined,
    uploadFile: (file) => uploadFile(file),
  });

  // Expose editor instance via ref
  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor;
    }
    return () => {
      if (editorRef) {
        editorRef.current = null;
      }
    };
  }, [editor, editorRef]);

  // Handle content changes
  const handleChange = useMemo(
    () => () => {
      // Skip the initial mount to prevent triggering onChange on load
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }

      if (onChange) {
        onChange(editor.document);
      }
    },
    [editor, onChange],
  );

  return (
    <div className="bn-container synapse-editor" data-theme="synapse">
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme="dark"
        onChange={handleChange}
        slashMenu={false} // Disable default slash menu to use our custom controller
      >
        <SuggestionMenuController
          triggerCharacter={"/"}
          getItems={async (query) =>
            filterSuggestionItems(getCustomSlashMenuItems(editor), query)
          }
        />
      </BlockNoteView>
    </div>
  );
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Convert BlockNote blocks to plain text for stats calculation.
 */
export function blocksToPlainText(blocks: any[]): string {
  const extractText = (block: any): string => {
    let text = "";

    // Extract text from inline content
    if (block.content && Array.isArray(block.content)) {
      text = block.content
        .map((item: any) => {
          if (typeof item === "string") return item;
          if ("text" in item) return item.text;
          return "";
        })
        .join("");
    }

    // Recursively extract from children
    if (block.children && Array.isArray(block.children)) {
      text += " " + block.children.map(extractText).join(" ");
    }

    return text;
  };

  return blocks.map(extractText).join("\n").trim();
}

/**
 * Calculate stats from BlockNote blocks.
 */
export function calculateBlockStats(blocks: any[]): {
  blocks: number;
  words: number;
  chars: number;
  blockTypes: Record<string, number>;
} {
  const plainText = blocksToPlainText(blocks);
  const words = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
  const chars = plainText.length;

  // Count block types
  const blockTypes: Record<string, number> = {};
  const countTypes = (block: any) => {
    blockTypes[block.type] = (blockTypes[block.type] || 0) + 1;
    if (block.children) {
      block.children.forEach(countTypes);
    }
  };
  blocks.forEach(countTypes);

  return {
    blocks: blocks.length,
    words,
    chars,
    blockTypes,
  };
}

export default BlockNoteEditor;
