import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Clock, Hash } from 'lucide-react';
import { format } from 'date-fns';
import type { NoteResponse } from '@/api/generated/types.gen';

interface NoteCardProps {
    note: NoteResponse;
    onClick: () => void;
    index?: number;
}

/**
 * Card view for individual note (grid/list display)
 */
export const NoteCard: React.FC<NoteCardProps> = ({ note, onClick, index = 0 }) => {
    return (
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={onClick}
        className="group p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/30 rounded-lg cursor-pointer transition-all"
        >
        <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-cyan-950/30 text-cyan-400 group-hover:text-cyan-300 transition-colors">
        <FileText size={18} />
        </div>

        <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-white group-hover:text-cyan-100 truncate mb-1">
        {note.title || 'Untitled'}
        </h3>

        {note.content && (
            <p className="text-xs text-slate-400 line-clamp-2 mb-2">
            {note.content.substring(0, 100)}...
            </p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1 text-xs font-mono text-slate-500">
        <Clock size={10} />
        {format(new Date(note.updated_at), 'MMM d')}
        </span>

        {note.tags && note.tags.slice(0, 3).map((tag) => (
            <span
            key={tag}
            className="flex items-center gap-1 text-xs font-mono text-slate-500 bg-white/5 px-1.5 py-0.5 rounded"
            >
            <Hash size={8} />
            {tag}
            </span>
        ))}
        </div>
        </div>
        </div>
        </motion.div>
    );
};
