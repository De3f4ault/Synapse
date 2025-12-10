/**
 * Note Editor Component - Synapse Creative Edition
 * Enhanced with cyberpunk aesthetics and neural-themed UI
 * File: frontend/src/pages/notes/components/editor/NoteEditor.tsx
 */

import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EditorMode } from '../../types/notes.types';

interface NoteEditorProps {
    title: string;
    content: string;
    onTitleChange: (title: string) => void;
    onContentChange: (content: string) => void;
    mode: EditorMode;
    placeholder?: string;
    textareaRef?: React.RefObject<HTMLTextAreaElement>;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
    title,
    content,
    onTitleChange,
    onContentChange,
    mode,
    placeholder = 'Initialize thought sequence...',
    textareaRef: externalRef
}) => {
    const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
    const titleRef = useRef<HTMLInputElement>(null);
    const textareaRef = externalRef || internalTextareaRef;

    // Character count and stats
    const [stats, setStats] = useState({
        chars: 0,
        words: 0,
        lines: 0
    });

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [content, textareaRef]);

    // Update stats
    useEffect(() => {
        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        const lines = content.split('\n').length;
        setStats({
            chars: content.length,
            words,
            lines
        });
    }, [content]);

    const isEditing = mode === 'edit';

    return (
        <div className="w-full space-y-8 relative">
        {/* Neural Activity Indicator */}
        {isEditing && (
            <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute -left-12 top-8 flex flex-col items-center gap-4"
            >
            <motion.div
            animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-[var(--synapse-cyan)] shadow-[0_0_10px_var(--synapse-cyan)]"
            />
            <div className="w-px h-16 bg-gradient-to-b from-[var(--synapse-cyan)]/50 to-transparent" />
            </motion.div>
        )}

        {/* Title Input with Holographic Effect */}
        <div className="border-b border-[var(--synapse-border-subtle)] pb-6 relative group">
        {/* Glow effect on focus */}
        <div className="absolute -inset-2 bg-gradient-to-r from-[var(--synapse-cyan)]/0 via-[var(--synapse-cyan)]/10 to-[var(--synapse-cyan)]/0 opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity duration-500" />

        <input
        ref={titleRef}
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="relative w-full bg-transparent text-4xl md:text-5xl font-serif text-[var(--synapse-text-primary)] placeholder:text-[var(--synapse-text-dim)] outline-none font-bold tracking-tight transition-all"
        placeholder="Untitled Neural Fragment"
        disabled={!isEditing}
        spellCheck={false}
        style={{
            textShadow: isEditing ? '0 0 20px rgba(34, 211, 238, 0.3)' : 'none'
        }}
        />

        {/* Title character counter */}
        {isEditing && title && (
            <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute right-0 -bottom-6 text-xs font-mono text-[var(--synapse-text-dim)] uppercase tracking-wider"
            >
            {title.length} chars
            </motion.div>
        )}
        </div>

        {/* Content Textarea with Neural Grid Background */}
        <div className="relative">
        {/* Animated grid pattern */}
        {isEditing && (
            <div
            className="absolute inset-0 pointer-events-none opacity-5"
            style={{
                backgroundImage: `
                linear-gradient(var(--synapse-cyan) 1px, transparent 1px),
                       linear-gradient(90deg, var(--synapse-cyan) 1px, transparent 1px)
                       `,
                       backgroundSize: '40px 40px',
                       backgroundPosition: '0 0, 0 0'
            }}
            />
        )}

        <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        className={cn(
            'relative w-full bg-transparent outline-none text-lg leading-relaxed resize-none font-serif placeholder:text-[var(--synapse-text-dim)] min-h-[500px] z-10',
                      isEditing
                      ? 'text-[var(--synapse-text-secondary)] selection:bg-[var(--synapse-cyan)]/30'
                      : 'text-[var(--synapse-text-secondary)] cursor-default'
        )}
        placeholder={placeholder}
        spellCheck={false}
        disabled={!isEditing}
        />

        {/* Typing indicator particles */}
        {isEditing && content && (
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute bottom-4 right-4 flex items-center gap-1"
            >
            <Activity size={12} className="text-[var(--synapse-cyan)]" />
            <span className="text-xs font-mono text-[var(--synapse-cyan)] uppercase tracking-wider">
            LIVE
            </span>
            </motion.div>
        )}
        </div>

        {/* Stats Bar */}
        {isEditing && content && (
            <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-4 bg-[var(--synapse-panel-bg)] border border-[var(--synapse-border-subtle)] rounded-xl backdrop-blur-sm"
            >
            <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
            <Zap size={14} className="text-[var(--synapse-cyan)]" />
            <span className="text-xs font-mono text-[var(--synapse-text-tertiary)] uppercase tracking-wider">
            {stats.words} words
            </span>
            </div>
            <div className="w-px h-4 bg-[var(--synapse-border-subtle)]" />
            <span className="text-xs font-mono text-[var(--synapse-text-tertiary)] uppercase tracking-wider">
            {stats.chars} chars
            </span>
            <div className="w-px h-4 bg-[var(--synapse-border-subtle)]" />
            <span className="text-xs font-mono text-[var(--synapse-text-tertiary)] uppercase tracking-wider">
            {stats.lines} lines
            </span>
            </div>

            {/* Reading time estimate */}
            <div className="text-xs font-mono text-[var(--synapse-text-dim)] uppercase tracking-wider">
            ~{Math.ceil(stats.words / 200)} min read
            </div>
            </motion.div>
        )}

        {/* Ambient glow effect at bottom */}
        {isEditing && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-[var(--synapse-cyan)]/5 blur-3xl pointer-events-none" />
        )}
        </div>
    );
};
