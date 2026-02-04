
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "@blocknote/xl-ai/style.css"; // AI Menu styles
import "./blocknote.theme.css";

import { BlockNoteEditor as BlockNoteEditorType } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import { BlockNoteView } from "@blocknote/mantine";
import {
  FormattingToolbar,
  FormattingToolbarController,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
} from "@blocknote/react";
import {
  AIMenuController,
  AIToolbarButton,
  getAISlashMenuItems,
} from "@blocknote/xl-ai";

import { useTextNote } from "../hooks/useTextNote";
import { BlockNoteEditorProps } from "../types";
import { getMentionSuggestions } from "../extensions/mentionSuggestions";

// ==================== AI-Enhanced Slash Menu ====================
function SuggestionMenuWithAI({ editor }: { editor: BlockNoteEditorType<any, any, any> }) {
  return (
    <SuggestionMenuController
      triggerCharacter="/"
      getItems={async (query) =>
        filterSuggestionItems(
          [
            ...getDefaultReactSlashMenuItems(editor),
            // Add AI slash menu items (Ask AI, etc.)
            ...getAISlashMenuItems(editor),
          ],
          query
        )
      }
    />
  );
}

// ==================== AI-Enhanced Formatting Toolbar ====================
function FormattingToolbarWithAI() {
  return (
    <FormattingToolbarController
      formattingToolbar={() => (
        <FormattingToolbar>
          {...getFormattingToolbarItems()}
          {/* AI Button for selected text actions */}
          <AIToolbarButton />
        </FormattingToolbar>
      )}
    />
  );
}

// ==================== Custom Mention Suggestion Menu UI ====================
function MentionSuggestionMenu({ items, selectedIndex, onItemClick }: any) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden min-w-[200px]">
      {items.map((item: any, index: number) => (
        <div
          key={item.id}
          className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between ${
            selectedIndex === index 
              ? "bg-cyan-900/50 text-cyan-100" 
              : "text-slate-300 hover:bg-slate-800"
          }`}
          onClick={() => onItemClick?.(item)}
        >
          <span>{item.title}</span>
          {item.badge && <span className="text-xs text-slate-500 ml-2">{item.badge}</span>}
        </div>
      ))}
    </div>
  );
}

// ==================== Mentions Menu (@ trigger) ====================
function MentionsMenu({ editor }: { editor: BlockNoteEditorType<any, any, any> }) {
  return (
    <SuggestionMenuController
      triggerCharacter="@"
      getItems={async (query: string) => getMentionSuggestions(query)}
      suggestionMenuComponent={MentionSuggestionMenu}
      onItemClick={(item: any) => {
        editor.insertInlineContent([
          {
            type: "text",
            text: `@${item.title}`,
            styles: { bold: true, textColor: "blue" },
          },
          {
            type: "text",
            text: " ",
            styles: {},
          },
        ]);
      }}
    />
  );
}

// ==================== Main Editor Component ====================
export function BlockNoteEditor({ note, readOnly = false, theme = 'dark' }: BlockNoteEditorProps) {
  // 1. Hook owns lifecycle and persistence (includes AI extension)
  const { editor, isSaving } = useTextNote(note);

  // 2. Render Phase
  return (
    <div className="relative h-full w-full flex flex-col group">
      {/* Saving Indicator (Subtle) */}
      <div className="absolute top-2 right-4 z-10 pointer-events-none">
        <span className={`text-xs text-slate-400 transition-opacity duration-300 ${isSaving ? 'opacity-100' : 'opacity-0'}`}>
          Saving...
        </span>
      </div>

      {/* 
        3. Official View Component with AI Integration
        - Disable default toolbar/slashMenu to inject AI-enhanced versions
      */}
      <BlockNoteView
        editor={editor}
        editable={!readOnly}
        theme={theme}
        formattingToolbar={false}
        slashMenu={false}
        className="flex-1 overflow-y-auto px-4 py-6"
      >
        {/* AI Command Menu (opened via toolbar button or slash menu) */}
        <AIMenuController />

        {/* Custom Formatting Toolbar with AI Button */}
        <FormattingToolbarWithAI />

        {/* Custom Slash Menu with AI Options */}
        <SuggestionMenuWithAI editor={editor} />

        {/* Mentions Menu (@ trigger) */}
        <MentionsMenu editor={editor} />
      </BlockNoteView>
    </div>
  );
}
