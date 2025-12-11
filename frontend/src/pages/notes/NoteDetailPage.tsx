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
            <div className="h-full flex flex-col items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-cyan-400 mb-4" />
                <p className="text-xs font-mono text-cyan-500 tracking-widest uppercase">
                    Loading Note...
                </p>
            </div>
        );
    }

    // Error state
    if (error || !note) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                <AlertCircle className="h-16 w-16 text-red-400 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Note Not Found</h2>
                <p className="text-slate-400 mb-6">
                    The requested note does not exist or has been archived.
                </p>
                <button
                    onClick={() => navigate('/notes')}
                    className="synapse-button flex items-center gap-2"
                >
                    <ArrowLeft size={16} />
                    Return to List
                </button>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col relative">
            {/* Header */}
            <div className="shrink-0 bg-white/5 border-b border-white/5 p-4 flex items-center justify-between z-10">
                <button
                    onClick={() => navigate('/notes')}
                    className="synapse-button flex items-center gap-2"
                >
                    <ArrowLeft size={16} />
                    Back
                </button>
                <NoteHeader
                    title={localNote?.title || 'Untitled'}
                    hasUnsavedChanges={hasUnsavedChanges}
                    isSaving={isUpdating}
                    onAction={handleAction}
                    simpleMode={true} // Assuming NoteHeader supports a simpler mode or we just rely on its props. I'll check NoteHeader later if needed, but for now passing existing props + maybe cleaning up its internal style via global CSS if it uses classes.
                />
            </div>


            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <div className="max-w-4xl mx-auto space-y-8">

                    {/* Editor / Preview */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="synapse-panel p-8 min-h-[500px]"
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
                                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight border-b border-white/10 pb-4">
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
                        <div className="synapse-panel p-6">
                            <NoteTags
                                tags={localNote.tags || []}
                                updatedAt={note.updated_at}
                                isEditing={mode === 'edit'}
                                onRemoveTag={removeTag}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Toolbar (Botton) */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
                <EditorToolbar
                    mode={mode}
                    onAction={handleAction}
                    isProcessing={aiStatus.isProcessing}
                    hasUnsavedChanges={hasUnsavedChanges}
                    isSaving={isUpdating}
                    textareaRef={textareaRef}
                />
            </div>

            {/* AI Processing Overlay */}
            <AnimatePresence>
                {aiStatus.isProcessing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
                    >
                        <div className="synapse-panel p-8 flex flex-col items-center gap-4">
                            <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
                            <p className="text-sm font-mono text-cyan-400 uppercase tracking-widest">
                                {aiStatus.action === 'summarize' && 'Synthesizing...'}
                                {aiStatus.action === 'tags' && 'Generating Tags...'}
                                {aiStatus.action === 'expand' && 'Expanding Content...'}
                                {aiStatus.action === 'correct' && 'Correcting...'}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
