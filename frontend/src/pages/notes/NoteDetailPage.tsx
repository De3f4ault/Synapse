/**
 * Complete Note Detail Page - Fully Functional
 * File: frontend/src/pages/notes/NoteDetailPage.tsx
 */

import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// Hooks
import { useNote, useNotes } from './hooks/useNotes';
import { useNoteEditor } from './hooks/useNoteEditor';

// Components
import { NoteEditor } from './components/editor/NoteEditor';
import { EditorToolbar } from './components/editor/EditorToolbar';
import { MarkdownPreview } from './components/editor/MarkdownPreview';
import { NoteHeader } from './components/detail/NoteHeader';
import { NoteTags } from './components/detail/NoteTags';

// Services
import { NoteAIService } from '@/services/noteAI.service';

// Types
import type { ToolDockAction } from './types/notes.types';

export function NoteDetailPage() {
    const { noteId } = useParams<{ noteId: string }>();
    const navigate = useNavigate();
    const numericNoteId = noteId ? parseInt(noteId) : 0;

    // Refs for textarea access
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Fetch note data
    const { note, isLoading, error } = useNote(numericNoteId);
    const { updateNote, deleteNote, isUpdating } = useNotes();

    // Editor state management
    const {
        mode,
        localNote,
        hasUnsavedChanges,
        aiStatus,
        updateTitle,
        updateContent,
        removeTag,
        addTag,
        toggleMode,
        save,
        startAIProcessing,
        stopAIProcessing,
    } = useNoteEditor({
        note,
        onSave: (data) => {
            if (numericNoteId) {
                updateNote({
                    noteId: numericNoteId,
                    data: {
                        title: data.title,
                        content: data.content,
                        tags: data.tags,
                    },
                });
            }
        },
    });

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + S to save
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                save();
            }
            // Cmd/Ctrl + E to toggle edit mode
            if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
                e.preventDefault();
                toggleMode();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [save, toggleMode]);

    // Handle toolbar actions
    const handleAction = async (action: ToolDockAction) => {
        if (!localNote) return;

        switch (action) {
            case 'toggle_edit':
                toggleMode();
                break;

            case 'save':
                save();
                break;

            case 'ai_summarize':
                try {
                    startAIProcessing('summarize');
                    const summary = await NoteAIService.summarize(localNote.content);

                    // Append summary to content
                    const newContent = `${localNote.content}\n\n---\n\n**NEURAL SYNTHESIS:**\n${summary}`;
                    updateContent(newContent);

                    toast.success('SYNTHESIS COMPLETE');
                } catch (error) {
                    toast.error('Neural link failure', {
                        description: error instanceof Error ? error.message : 'Unknown error'
                    });
                } finally {
                    stopAIProcessing();
                }
                break;

            case 'ai_tags':
                try {
                    startAIProcessing('tags');
                    const newTags = await NoteAIService.generateTags(localNote.title, localNote.content);

                    // Add new tags to existing ones (remove duplicates)
                    const allTags = [...new Set([...(localNote.tags || []), ...newTags])];
                    updateContent(localNote.content); // Trigger update
                    localNote.tags = allTags;

                    toast.success(`Generated ${newTags.length} tags`);
                } catch (error) {
                    toast.error('Tag generation failed', {
                        description: error instanceof Error ? error.message : 'Unknown error'
                    });
                } finally {
                    stopAIProcessing();
                }
                break;

            case 'delete':
                if (window.confirm('Archive this fragment permanently?')) {
                    deleteNote(numericNoteId, {
                        onSuccess: () => navigate('/notes'),
                    });
                }
                break;
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="h-screen w-screen bg-[#020408] flex items-center justify-center">
            <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-cyan-400 mb-4" />
            <p className="text-xs font-mono text-cyan-500 tracking-widest uppercase">
            Loading Fragment...
            </p>
            </div>
            </div>
        );
    }

    // Error state
    if (error || !note) {
        return (
            <div className="h-screen w-screen bg-[#020408] flex items-center justify-center">
            <div className="flex flex-col items-center text-center max-w-md">
            <AlertCircle className="h-16 w-16 text-red-400 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Fragment Not Found</h2>
            <p className="text-slate-400 mb-6">
            The requested neural fragment does not exist or has been archived.
            </p>
            <button
            onClick={() => navigate('/notes')}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-300 text-sm font-bold uppercase tracking-widest transition-all"
            >
            <ArrowLeft size={16} />
            Return to Codex
            </button>
            </div>
            </div>
        );
    }

    return (
        <div className="relative w-full min-h-screen bg-[#020408] text-slate-200 font-sans overflow-hidden flex flex-col">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/30 via-[#020408] to-black opacity-70" />

        {/* Header */}
        <NoteHeader
        title={localNote?.title || 'Untitled'}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isUpdating}
        onAction={handleAction}
        />

        {/* Main Content Area */}
        <div className="flex-1 relative z-10 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Back Button */}
        <button
        onClick={() => navigate('/notes')}
        className="mb-8 flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-400 transition-colors group"
        >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-mono uppercase tracking-wider">Back to Codex</span>
        </button>

        {/* Editor / Preview */}
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
        >
        {mode === 'edit' && localNote ? (
            <NoteEditor
            title={localNote.title}
            content={localNote.content}
            onTitleChange={updateTitle}
            onContentChange={updateContent}
            mode={mode}
            textareaRef={textareaRef}
            />
        ) : (
            <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-serif text-white font-bold tracking-tight">
            {note.title || 'Untitled'}
            </h1>
            <div className="prose prose-invert prose-cyan max-w-none">
            <MarkdownPreview content={note.content || ''} />
            </div>
            </div>
        )}
        </motion.div>

        {/* Tags & Metadata */}
        {localNote && (
            <NoteTags
            tags={localNote.tags || []}
            updatedAt={note.updated_at}
            isEditing={mode === 'edit'}
            onRemoveTag={removeTag}
            />
        )}

        {/* Spacer for toolbar */}
        <div className="h-32" />
        </div>
        </div>

        {/* Floating Toolbar */}
        <EditorToolbar
        mode={mode}
        onAction={handleAction}
        isProcessing={aiStatus.isProcessing}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isUpdating}
        textareaRef={textareaRef}
        />

        {/* AI Processing Overlay */}
        {aiStatus.isProcessing && (
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center"
            >
            <div className="bg-[#0a0c12] border border-cyan-500/30 rounded-xl p-8 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-cyan-400" />
            <p className="text-sm font-mono text-cyan-400 uppercase tracking-widest">
            {aiStatus.action === 'summarize' && 'Neural Synthesis In Progress...'}
            {aiStatus.action === 'tags' && 'Analyzing Semantic Vectors...'}
            {aiStatus.action === 'expand' && 'Expanding Thought Sequence...'}
            {aiStatus.action === 'correct' && 'Optimizing Structure...'}
            </p>
            </div>
            </motion.div>
        )}
        </div>
    );
}
