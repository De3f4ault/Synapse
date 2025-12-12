import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight,
    Share2,
    MoreVertical,
    Save,
    Trash2,
    Loader2,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { ToolDockAction } from '../../types/notes.types';

interface NoteHeaderProps {
    title: string;
    hasUnsavedChanges: boolean;
    isSaving: boolean;
    onAction: (action: ToolDockAction) => void;
}

/**
 * Note detail page header with breadcrumbs and actions - Synapse Style
 */
export const NoteHeader: React.FC<NoteHeaderProps> = ({
    title,
    hasUnsavedChanges,
    isSaving,
    onAction,
}) => {
    return (
        <div className="h-16 flex items-center justify-between px-8 border-b border-[var(--synapse-border-subtle)] bg-[var(--synapse-bg-secondary)]/80 backdrop-blur-md z-20 relative">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-mono text-[var(--synapse-text-dim)]">
        <span className="opacity-50 uppercase tracking-wider">root</span>
        <ChevronRight size={12} />
        <span className="opacity-50 uppercase tracking-wider">fragments</span>
        <ChevronRight size={12} />
        <span className="text-[var(--synapse-cyan)] flex items-center gap-2 uppercase tracking-wider font-bold">
        {title}
        {hasUnsavedChanges && (
            <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-1.5 h-1.5 bg-[var(--synapse-amber)] rounded-full synapse-pulse"
            />
        )}
        </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
        {/* Save Indicator */}
        <AnimatePresence>
        {isSaving && (
            <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex items-center gap-2 text-xs font-mono text-[var(--synapse-cyan)] uppercase tracking-wider"
            >
            <Loader2 size={14} className="animate-spin" />
            SYNCING...
            </motion.div>
        )}
        </AnimatePresence>

        <button
        className="synapse-icon-button"
        title="Share Fragment"
        >
        <Share2 size={18} />
        </button>

        <DropdownMenu>
        <DropdownMenuTrigger asChild>
        <button className="synapse-icon-button">
        <MoreVertical size={18} />
        </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
        align="end"
        className="bg-[var(--synapse-bg-secondary)] border-[var(--synapse-border-subtle)] backdrop-blur-xl"
        >
        <DropdownMenuItem
        onClick={() => onAction('save')}
        className="text-white hover:bg-[var(--synapse-panel-hover)] focus:bg-[var(--synapse-panel-hover)]"
        >
        <Save className="mr-2 h-4 w-4" />
        Save Changes
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[var(--synapse-border-subtle)]" />
        <DropdownMenuItem
        onClick={() => onAction('delete')}
        className="text-[var(--synapse-red)] focus:text-[var(--synapse-red)] hover:bg-red-500/10"
        >
        <Trash2 className="mr-2 h-4 w-4" />
        Archive Fragment
        </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
        </div>
        </div>
    );
};
