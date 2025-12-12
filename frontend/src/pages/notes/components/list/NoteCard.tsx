import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Clock, Hash, TrendingUp, Zap } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { NoteResponse } from '@/api/generated';

interface NoteCardProps {
    note: NoteResponse;
    onClick: () => void;
    index?: number;
}

/**
 * Card view for individual note - Synapse Creative Edition
 * Features: Holographic borders, neural activity indicators, smart previews
 */
export const NoteCard: React.FC<NoteCardProps> = ({ note, onClick, index = 0 }) => {
    const [isHovered, setIsHovered] = useState(false);

    // Calculate note "heat" based on recency
    const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(note.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    const isHot = daysSinceUpdate <= 1;
    const isWarm = daysSinceUpdate <= 7;

    // Word count
    const wordCount = note.content ? note.content.trim().split(/\s+/).length : 0;

    return (
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={onClick}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className="group relative p-5 bg-[var(--synapse-panel-bg)] hover:bg-[var(--synapse-panel-hover)] border border-[var(--synapse-border-subtle)] hover:border-[var(--synapse-cyan)]/50 rounded-xl cursor-pointer transition-all duration-300 overflow-hidden"
        >
        {/* Holographic shimmer effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--synapse-cyan)]/5 via-transparent to-[var(--synapse-blue)]/5" />
        <motion.div
        animate={{
            x: ['-100%', '100%']
        }}
        transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear'
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--synapse-cyan)]/10 to-transparent"
        style={{ width: '50%' }}
        />
        </div>

        {/* Corner accent */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[var(--synapse-cyan)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="relative z-10 flex flex-col h-full">
        {/* Header with icon and status */}
        <div className="flex items-start gap-3 mb-3">
        <motion.div
        animate={isHovered ? {
            rotate: [0, 5, -5, 0],
            scale: [1, 1.1, 1]
        } : {}}
        transition={{ duration: 0.5 }}
        className="relative p-2.5 rounded-lg bg-[var(--synapse-cyan)]/10 text-[var(--synapse-cyan)] border border-[var(--synapse-cyan)]/20 group-hover:border-[var(--synapse-cyan)]/50 transition-all"
        >
        <FileText size={18} />
        {isHot && (
            <motion.div
            animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--synapse-red)] shadow-[0_0_8px_var(--synapse-red)]"
            />
        )}
        </motion.div>

        <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-[var(--synapse-text-primary)] group-hover:text-[var(--synapse-cyan)] truncate mb-1 uppercase tracking-wide transition-colors">
        {note.title || 'Untitled Fragment'}
        </h3>

        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap">
        {isHot && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-[var(--synapse-red)]/10 border border-[var(--synapse-red)]/30 rounded-full text-[10px] font-mono text-[var(--synapse-red)] uppercase tracking-wider">
            <Zap size={8} />
            HOT
            </span>
        )}
        {isWarm && !isHot && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-[var(--synapse-amber)]/10 border border-[var(--synapse-amber)]/30 rounded-full text-[10px] font-mono text-[var(--synapse-amber)] uppercase tracking-wider">
            <TrendingUp size={8} />
            ACTIVE
            </span>
        )}
        </div>
        </div>
        </div>

        {/* Content preview with fade effect */}
        {note.content && (
            <div className="relative mb-3 flex-1">
            <p className="text-xs text-[var(--synapse-text-tertiary)] leading-relaxed line-clamp-3">
            {note.content.substring(0, 150)}...
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[var(--synapse-panel-bg)] group-hover:from-[var(--synapse-panel-hover)] to-transparent" />
            </div>
        )}

        {/* Footer with metadata */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-[var(--synapse-border-subtle)] group-hover:border-[var(--synapse-cyan)]/20 transition-colors">
        {/* Left: Timestamp */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--synapse-text-dim)] uppercase tracking-wider">
        <Clock size={9} />
        {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
        </div>

        {/* Right: Stats */}
        <div className="flex items-center gap-3">
        {wordCount > 0 && (
            <span className="text-[10px] font-mono text-[var(--synapse-text-dim)] uppercase tracking-wider">
            {wordCount}w
            </span>
        )}
        {note.tags && note.tags.length > 0 && (
            <div className="flex items-center gap-1">
            <Hash size={9} className="text-[var(--synapse-cyan)]" />
            <span className="text-[10px] font-mono text-[var(--synapse-cyan)] uppercase tracking-wider">
            {note.tags.length}
            </span>
            </div>
        )}
        </div>
        </div>

        {/* Tags preview */}
        {note.tags && note.tags.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {note.tags.slice(0, 2).map((tag) => (
                <span
                key={tag}
                className="px-2 py-0.5 bg-[var(--synapse-panel-bg)] border border-[var(--synapse-border-subtle)] rounded-full text-[9px] font-mono text-[var(--synapse-text-dim)] uppercase tracking-wider group-hover:border-[var(--synapse-cyan)]/30 group-hover:text-[var(--synapse-cyan)] transition-all"
                >
                {tag}
                </span>
            ))}
            {note.tags.length > 2 && (
                <span className="text-[9px] font-mono text-[var(--synapse-text-dim)] uppercase tracking-wider">
                +{note.tags.length - 2}
                </span>
            )}
            </div>
        )}
        </div>

        {/* Hover glow effect */}
        <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        className="absolute -inset-px bg-gradient-to-r from-[var(--synapse-cyan)]/20 via-[var(--synapse-blue)]/20 to-[var(--synapse-cyan)]/20 rounded-xl blur-sm -z-10"
        />
        </motion.div>
    );
};
