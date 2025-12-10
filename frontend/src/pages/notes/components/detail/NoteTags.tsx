import React from 'react';
import { motion } from 'framer-motion';
import { Hash, X, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface NoteTagsProps {
    tags: string[];
    updatedAt?: string;
    isEditing: boolean;
    onRemoveTag: (tag: string) => void;
}

/**
 * Display and manage note tags with metadata - Synapse Style
 */
export const NoteTags: React.FC<NoteTagsProps> = ({
    tags,
    updatedAt,
    isEditing,
    onRemoveTag,
}) => {
    return (
        <div className="flex flex-wrap items-center gap-3 mt-4">
        {/* Timestamp */}
        {updatedAt && (
            <span className="flex items-center gap-1.5 text-xs font-mono text-[var(--synapse-cyan)]/60 bg-[var(--synapse-cyan)]/10 px-3 py-1.5 rounded-full border border-[var(--synapse-cyan)]/20 uppercase tracking-wider">
            <Clock size={10} />
            {format(new Date(updatedAt), 'MMM d, HH:mm')}
            </span>
        )}

        {/* Tags */}
        {tags.map((tag) => (
            <motion.span
            key={tag}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="group flex items-center gap-1.5 bg-[var(--synapse-panel-bg)] px-3 py-1.5 rounded-full hover:bg-[var(--synapse-panel-hover)] border border-[var(--synapse-border-subtle)] hover:border-[var(--synapse-cyan)]/30 transition-all cursor-pointer text-xs font-mono text-[var(--synapse-text-secondary)] hover:text-[var(--synapse-cyan)] uppercase tracking-wider"
            >
            <Hash size={10} />
            {tag}
            {isEditing && (
                <button
                onClick={() => onRemoveTag(tag)}
                className="opacity-0 group-hover:opacity-100 hover:text-[var(--synapse-red)] transition-all ml-1"
                >
                <X size={10} />
                </button>
            )}
            </motion.span>
        ))}
        </div>
    );
};
