/**
 * Note Editor Component - Updated with Ref Support
 * File: frontend/src/pages/notes/components/editor/NoteEditor.tsx
 */

import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { EditorMode } from '../../types/notes.types';

interface NoteEditorProps {
    title: string;
    content: string;
    onTitleChange: (title: string) => void;
    onContentChange: (content: string) => void;
    mode: EditorMode;
    placeholder?: string;
    textareaRef?: React.RefObject<HTMLTextAreaElement>; // NEW: Accept external ref
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
    title,
    content,
    onTitleChange,
    onContentChange,
    mode,
    placeholder = 'Initialize thought sequence...',
    textareaRef: externalRef // Receive from parent
}) => {
    // Internal refs
    const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
    const titleRef = useRef<HTMLInputElement>(null);

    // Use external ref if provided, otherwise use internal
    const textareaRef = externalRef || internalTextareaRef;

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [content, textareaRef]);

    const isEditing = mode === 'edit';

    return (
        <div className="w-full space-y-8">
        {/* Title Input */}
        <div className="border-b border-white/5 pb-6">
        <input
        ref={titleRef}
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="w-full bg-transparent text-4xl md:text-5xl font-serif text-white placeholder:text-slate-700 outline-none font-bold tracking-tight"
        placeholder="Untitled Artifact"
        disabled={!isEditing}
        spellCheck={false}
        />
        </div>

        {/* Content Textarea */}
        <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        className={cn(
            'w-full bg-transparent outline-none text-lg leading-relaxed resize-none font-serif text-slate-300 placeholder:text-slate-700 min-h-[500px] selection:bg-cyan-500/30',
            !isEditing && 'cursor-default'
        )}
        placeholder={placeholder}
        spellCheck={false}
        disabled={!isEditing}
        />
        </div>
    );
};
