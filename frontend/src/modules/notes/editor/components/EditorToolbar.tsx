/**
 * Notes Module - EditorToolbar Component
 * Floating toolbar with formatting, AI actions, and save button.
 *
 * MIGRATED FROM: pages/notes/components/editor/EditorToolbar.tsx
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
    Tag,
    Save,
    Check,
    Loader2,
    Heading2,
    Link,
    Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { markdownFormatters } from "../engine/selection";
import type { EditorMode, ToolDockAction } from "../../core";

// ============================================================================
// Types
// ============================================================================

interface EditorToolbarProps {
    mode: EditorMode;
    onAction: (action: ToolDockAction) => void;
    isProcessing: boolean;
    hasUnsavedChanges: boolean;
    isSaving?: boolean;
    textareaRef?: React.RefObject<HTMLTextAreaElement>;
}

// ============================================================================
// Component
// ============================================================================

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

    const ToolbarButton = ({ 
        onClick, 
        active = false, 
        disabled = false, 
        children, 
        title,
        className 
    }: { 
        onClick: () => void; 
        active?: boolean; 
        disabled?: boolean; 
        children: React.ReactNode; 
        title?: string;
        className?: string;
    }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={cn(
                "w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200",
                active 
                    ? "bg-white/10 text-cyan-400" 
                    : "text-slate-400 hover:text-white hover:bg-white/5",
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
        >
            {children}
        </button>
    );

    return (
        <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center gap-1 p-1 bg-[#050505]/80 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl"
        >
            {/* Edit/View Toggle */}
            <div className="flex items-center gap-1 px-1 pr-2 border-r border-white/10">
                <ToolbarButton
                    active={isEditing}
                    onClick={() => onAction("toggle_edit")}
                    className="w-10 h-10"
                    title={isEditing ? "View Mode (⌘E)" : "Edit Mode (⌘E)"}
                >
                    {isEditing ? <Edit3 size={18} /> : <Eye size={18} />}
                </ToolbarButton>
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
                        <ToolbarButton onClick={() => handleFormat("bold")} title="Bold (⌘B)">
                            <Bold size={16} />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => handleFormat("italic")} title="Italic (⌘I)">
                            <Italic size={16} />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => handleFormat("heading")} title="Heading">
                            <Heading2 size={16} />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => handleFormat("list")} title="List">
                            <List size={16} />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => handleFormat("code")} title="Code">
                            <Code size={16} />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => handleFormat("link")} title="Link">
                            <Link size={16} />
                        </ToolbarButton>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* AI Actions */}
            <div className="flex items-center gap-1 px-1 pl-2 border-l border-white/10">
                <ToolbarButton
                    onClick={() => onAction("ai_summarize")}
                    disabled={isProcessing}
                    className="hover:text-purple-400 hover:bg-purple-500/10"
                    title="Neural Synthesis"
                >
                    {isProcessing ? (
                        <Loader2 size={18} className="animate-spin text-purple-400" />
                    ) : (
                        <Sparkles size={18} />
                    )}
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => onAction("ai_tags")}
                    disabled={isProcessing}
                    className="hover:text-cyan-400 hover:bg-cyan-500/10"
                    title="Auto-Tag"
                >
                    <Tag size={18} />
                </ToolbarButton>
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
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
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
