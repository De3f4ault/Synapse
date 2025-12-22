/**
 * Enhanced Editor Toolbar - Synapse Style
 * File: frontend/src/pages/notes/components/editor/EditorToolbar.tsx
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Edit3,
  Eye,
  Bold,
  Italic,
  List,
  Code,
  Bot,
  Tag,
  Save,
  Check,
  Loader2,
  Heading2,
  Link,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { markdownFormatters } from "../../utils/textSelection";
import type { EditorMode, ToolDockAction } from "../../types/notes.types";
import { NeumorphicButton } from "@/components/neumorphic";

interface EditorToolbarProps {
  mode: EditorMode;
  onAction: (action: ToolDockAction) => void;
  isProcessing: boolean;
  hasUnsavedChanges: boolean;
  isSaving?: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  mode,
  onAction,
  isProcessing,
  hasUnsavedChanges,
  isSaving = false,
  textareaRef,
}) => {
  const isEditing = mode === "edit";

  // Formatting handlers
  const handleFormat = (type: string) => {
    if (!textareaRef?.current || !isEditing) return;

    const textarea = textareaRef.current;

    switch (type) {
      case "bold":
        markdownFormatters.bold(textarea);
        break;
      case "italic":
        markdownFormatters.italic(textarea);
        break;
      case "code":
        markdownFormatters.code(textarea);
        break;
      case "list":
        markdownFormatters.list(textarea, false);
        break;
      case "heading":
        markdownFormatters.heading(textarea, 2);
        break;
      case "link":
        markdownFormatters.link(textarea);
        break;
    }
  };

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center gap-1 p-1 bg-[#13151a]/90 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl"
    >
      {/* Edit/View Toggle */}
      <div className="flex items-center gap-1 px-1 pr-2 border-r border-white/10">
        <NeumorphicButton
          variant={isEditing ? "primary" : "ghost"}
          size="icon"
          onClick={() => onAction("toggle_edit")}
          className="w-10 h-10 rounded-full"
          title={isEditing ? "View Mode (⌘E)" : "Edit Mode (⌘E)"}
        >
          {isEditing ? <Edit3 size={18} /> : <Eye size={18} />}
        </NeumorphicButton>
      </div>

      {/* Formatting Tools */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "auto", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1 px-1 overflow-hidden"
          >
            <NeumorphicButton
              variant="ghost"
              size="icon"
              onClick={() => handleFormat("bold")}
              className="w-9 h-9 rounded-full"
              title="Bold (⌘B)"
            >
              <Bold size={16} />
            </NeumorphicButton>
            <NeumorphicButton
              variant="ghost"
              size="icon"
              onClick={() => handleFormat("italic")}
              className="w-9 h-9 rounded-full"
              title="Italic (⌘I)"
            >
              <Italic size={16} />
            </NeumorphicButton>
            <NeumorphicButton
              variant="ghost"
              size="icon"
              onClick={() => handleFormat("heading")}
              className="w-9 h-9 rounded-full"
              title="Heading"
            >
              <Heading2 size={16} />
            </NeumorphicButton>
            <NeumorphicButton
              variant="ghost"
              size="icon"
              onClick={() => handleFormat("list")}
              className="w-9 h-9 rounded-full"
              title="List"
            >
              <List size={16} />
            </NeumorphicButton>
            <NeumorphicButton
              variant="ghost"
              size="icon"
              onClick={() => handleFormat("code")}
              className="w-9 h-9 rounded-full"
              title="Code"
            >
              <Code size={16} />
            </NeumorphicButton>
            <NeumorphicButton
              variant="ghost"
              size="icon"
              onClick={() => handleFormat("link")}
              className="w-9 h-9 rounded-full"
              title="Link"
            >
              <Link size={16} />
            </NeumorphicButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Actions */}
      <div className="flex items-center gap-1 px-1 pl-2 border-l border-white/10">
        <NeumorphicButton
          variant="ghost"
          size="icon"
          onClick={() => onAction("ai_summarize")}
          disabled={isProcessing}
          className="w-9 h-9 rounded-full hover:text-purple-400"
          title="Neural Synthesis"
        >
          {isProcessing ? (
            <Loader2 size={18} className="animate-spin text-purple-400" />
          ) : (
            <Sparkles size={18} />
          )}
        </NeumorphicButton>
        <NeumorphicButton
          variant="ghost"
          size="icon"
          onClick={() => onAction("ai_tags")}
          disabled={isProcessing}
          className="w-9 h-9 rounded-full hover:text-cyan-400"
          title="Auto-Tag"
        >
          <Tag size={18} />
        </NeumorphicButton>
      </div>

      {/* Save Button */}
      <div className="pl-1">
        <motion.button
          onClick={() => onAction("save")}
          disabled={isSaving}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-all disabled:opacity-50",
            hasUnsavedChanges
              ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:scale-105 active:scale-95"
              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20",
          )}
          animate={
            hasUnsavedChanges && !isSaving ? { scale: [1, 1.05, 1] } : {}
          }
          transition={{ duration: 2, repeat: Infinity }}
          title={hasUnsavedChanges ? "Save Changes (⌘S)" : "All Changes Saved"}
        >
          {isSaving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : hasUnsavedChanges ? (
            <Save size={18} />
          ) : (
            <Check size={18} />
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};
