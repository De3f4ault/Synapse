/**
 * Enhanced Editor Toolbar - Synapse Style
 * File: frontend/src/pages/notes/components/editor/EditorToolbar.tsx
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Edit3, Eye, Bold, Italic, List, Code, Bot, Tag,
    Save, Check, Loader2, Heading2, Link, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { markdownFormatters } from '../../utils/textSelection';
import type { EditorMode, ToolDockAction } from '../../types/notes.types';

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
    textareaRef
}) => {
    const isEditing = mode === 'edit';

    // Formatting handlers
    const handleFormat = (type: string) => {
        if (!textareaRef?.current || !isEditing) return;

        const textarea = textareaRef.current;

        switch (type) {
            case 'bold':
                markdownFormatters.bold(textarea);
                break;
            case 'italic':
                markdownFormatters.italic(textarea);
                break;
            case 'code':
                markdownFormatters.code(textarea);
                break;
            case 'list':
                markdownFormatters.list(textarea, false);
                break;
            case 'heading':
                markdownFormatters.heading(textarea, 2);
                break;
            case 'link':
                markdownFormatters.link(textarea);
                break;
        }
    };

    return (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
        <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-1 p-1.5 bg-[var(--synapse-bg-secondary)]/95 backdrop-blur-xl border border-[var(--synapse-border-subtle)] rounded-full shadow-2xl shadow-black/50"
        >
        {/* Edit/View Toggle */}
        <div className="flex items-center gap-1 px-2 border-r border-[var(--synapse-border-subtle)]">
        <button
        onClick={() => onAction('toggle_edit')}
        className={cn(
            'p-3 rounded-full transition-all relative group',
            isEditing
            ? 'bg-[var(--synapse-cyan)]/20 text-[var(--synapse-cyan)] shadow-[0_0_15px_rgba(34,211,238,0.3)]'
            : 'text-[var(--synapse-text-tertiary)] hover:text-white hover:bg-[var(--synapse-panel-hover)]'
        )}
        title={isEditing ? 'View Mode (⌘E)' : 'Edit Mode (⌘E)'}
        >
        {isEditing ? <Edit3 size={18} /> : <Eye size={18} />}
        <div className="absolute inset-0 bg-[var(--synapse-cyan)]/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        </div>

        {/* Formatting Tools */}
        <AnimatePresence>
        {isEditing && (
            <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1 px-2 overflow-hidden"
            >
            <button
            onClick={() => handleFormat('bold')}
            className="p-2.5 text-[var(--synapse-text-tertiary)] hover:text-white hover:bg-[var(--synapse-panel-hover)] rounded-full transition-colors"
            title="Bold (⌘B)"
            >
            <Bold size={16} />
            </button>
            <button
            onClick={() => handleFormat('italic')}
            className="p-2.5 text-[var(--synapse-text-tertiary)] hover:text-white hover:bg-[var(--synapse-panel-hover)] rounded-full transition-colors"
            title="Italic (⌘I)"
            >
            <Italic size={16} />
            </button>
            <button
            onClick={() => handleFormat('heading')}
            className="p-2.5 text-[var(--synapse-text-tertiary)] hover:text-white hover:bg-[var(--synapse-panel-hover)] rounded-full transition-colors"
            title="Heading"
            >
            <Heading2 size={16} />
            </button>
            <button
            onClick={() => handleFormat('list')}
            className="p-2.5 text-[var(--synapse-text-tertiary)] hover:text-white hover:bg-[var(--synapse-panel-hover)] rounded-full transition-colors"
            title="List"
            >
            <List size={16} />
            </button>
            <button
            onClick={() => handleFormat('code')}
            className="p-2.5 text-[var(--synapse-text-tertiary)] hover:text-white hover:bg-[var(--synapse-panel-hover)] rounded-full transition-colors"
            title="Code"
            >
            <Code size={16} />
            </button>
            <button
            onClick={() => handleFormat('link')}
            className="p-2.5 text-[var(--synapse-text-tertiary)] hover:text-white hover:bg-[var(--synapse-panel-hover)] rounded-full transition-colors"
            title="Link"
            >
            <Link size={16} />
            </button>
            </motion.div>
        )}
        </AnimatePresence>

        {/* AI Actions */}
        <div className="flex items-center gap-1 px-2 border-l border-[var(--synapse-border-subtle)]">
        <button
        onClick={() => onAction('ai_summarize')}
        disabled={isProcessing}
        className="p-2.5 text-[var(--synapse-text-tertiary)] hover:text-[var(--synapse-purple)] hover:bg-[var(--synapse-purple)]/10 rounded-full transition-colors group relative disabled:opacity-50"
        title="Neural Synthesis"
        >
        {isProcessing ? (
            <Loader2 size={18} className="animate-spin text-[var(--synapse-purple)]" />
        ) : (
            <Sparkles size={18} />
        )}
        <div className="absolute inset-0 bg-[var(--synapse-purple)]/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        <button
        onClick={() => onAction('ai_tags')}
        disabled={isProcessing}
        className="p-2.5 text-[var(--synapse-text-tertiary)] hover:text-[var(--synapse-emerald)] hover:bg-[var(--synapse-emerald)]/10 rounded-full transition-colors group relative disabled:opacity-50"
        title="Auto-Tag"
        >
        <Tag size={18} />
        <div className="absolute inset-0 bg-[var(--synapse-emerald)]/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        </div>

        {/* Save Button */}
        <motion.button
        onClick={() => onAction('save')}
        disabled={isSaving}
        className={cn(
            'ml-2 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-all disabled:opacity-50',
            hasUnsavedChanges
            ? 'bg-gradient-to-r from-[var(--synapse-cyan)] to-[var(--synapse-blue)] hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] hover:scale-105 active:scale-95'
            : 'bg-gradient-to-r from-[var(--synapse-emerald)] to-green-600 shadow-emerald-900/50'
        )}
        animate={hasUnsavedChanges && !isSaving ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
        title={hasUnsavedChanges ? 'Save Changes (⌘S)' : 'All Changes Saved'}
        >
        {isSaving ? (
            <Loader2 size={18} className="animate-spin" />
        ) : hasUnsavedChanges ? (
            <Save size={18} />
        ) : (
            <Check size={18} />
        )}
        </motion.button>
        </motion.div>
        </div>
    );
};
