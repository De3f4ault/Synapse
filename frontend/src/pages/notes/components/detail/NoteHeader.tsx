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
 * Note detail page header with breadcrumbs and actions
 */
export const NoteHeader: React.FC<NoteHeaderProps> = ({
    title,
    hasUnsavedChanges,
    isSaving,
    onAction,
}) => {
    return (
        <div className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-black/10 backdrop-blur-sm z-20 relative">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
        <span className="opacity-50">root</span>
        <ChevronRight size={12} />
        <span className="opacity-50">...</span>
        <ChevronRight size={12} />
        <span className="text-cyan-500 flex items-center gap-2">
        {title}
        {hasUnsavedChanges && (
            <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-1.5 h-1.5 bg-amber-500 rounded-full"
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
            className="flex items-center gap-2 text-xs font-mono text-cyan-500"
            >
            <Loader2 size={14} className="animate-spin" />
            SYNCING...
            </motion.div>
        )}
        </AnimatePresence>

        <button
        className="p-2 hover:bg-white/5 rounded-md text-slate-500 hover:text-white transition-colors"
        title="Share Fragment"
        >
        <Share2 size={18} />
        </button>

        <DropdownMenu>
        <DropdownMenuTrigger asChild>
        <button className="p-2 hover:bg-white/5 rounded-md text-slate-500 hover:text-white transition-colors">
        <MoreVertical size={18} />
        </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-[#0a0c12] border-white/10">
        <DropdownMenuItem onClick={() => onAction('save')} className="text-white">
        <Save className="mr-2 h-4 w-4" />
        Save Changes
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/5" />
        <DropdownMenuItem
        onClick={() => onAction('delete')}
        className="text-red-400 focus:text-red-300"
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
