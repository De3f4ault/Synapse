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
 * Display and manage note tags with metadata
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
            <span className="flex items-center gap-1.5 text-xs font-mono text-cyan-500/60 bg-cyan-950/20 px-2 py-1 rounded border border-cyan-900/30">
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
            className="group flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded hover:text-cyan-300 hover:bg-white/10 transition-all cursor-pointer text-xs font-mono text-slate-400"
            >
            <Hash size={10} />
            {tag}
            {isEditing && (
                <button
                onClick={() => onRemoveTag(tag)}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity ml-1"
                >
                <X size={10} />
                </button>
            )}
            </motion.span>
        ))}
        </div>
    );
};
