/**
 * Document-Style Note Editor with AI Insights Panel
 * Mature, professional design with floating toolbar and non-destructive AI
 */

import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Loader2, AlertCircle, Columns, FileText, Sun, Moon
} from 'lucide-react';
import { toast } from 'sonner';
import { useThemeStore } from '@/stores/themeStore';

// Hooks
import { useNote, useNotes } from './hooks/useNotes';
import { useNoteEditor } from './hooks/useNoteEditor';

// Components
import { MarkdownPreview } from './components/editor/MarkdownPreview';
import { EditorToolbar } from './components/editor/EditorToolbar';
import { AIInsightsPanel } from './components/editor/AIInsightsPanel';

// Services
import { NoteAIService } from '@/services/noteAI.service';

// Types
import type { ToolDockAction } from './types/notes.types';

interface AIInsight {
    type: 'summary' | 'tags' | 'expansion' | 'suggestions';
    title: string;
    content: string | string[];
    timestamp: Date;
}

export function NoteDetailPage() {
    const { noteId } = useParams<{ noteId: string }>();
    const navigate = useNavigate();
    const numericNoteId = noteId ? parseInt(noteId) : 0;

    // Refs
    const titleRef = useRef<HTMLTextAreaElement>(null);
    const contentRef = useRef<HTMLTextAreaElement>(null);

    // State
    const [splitView, setSplitView] = useState(false);
    const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
    const [showAIPanel, setShowAIPanel] = useState(false);
    const { theme, toggleTheme } = useThemeStore();

    // Fetch note data
    const { note, isLoading, error } = useNote(numericNoteId);
    const { updateNote, deleteNote, isUpdating } = useNotes();

    // Editor state
    const {
        mode,
        localNote,
        hasUnsavedChanges,
        aiStatus,
        updateTitle,
        updateContent,
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

    // Auto-resize title
    useEffect(() => {
        if (titleRef.current) {
            titleRef.current.style.height = 'auto';
            titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
        }
    }, [localNote?.title]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                save();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
                e.preventDefault();
                toggleMode();
            }
            if (e.key === 'Escape') {
                navigate('/notes');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [save, toggleMode, navigate]);

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

                    setAiInsights(prev => [...prev, {
                        type: 'summary',
                        title: 'AI Summary',
                        content: summary,
                        timestamp: new Date(),
                    }]);
                    setShowAIPanel(true);

                    toast.success('Summary generated');
                } catch (error) {
                    toast.error('Failed to generate summary');
                } finally {
                    stopAIProcessing();
                }
                break;

            case 'ai_tags':
                try {
                    startAIProcessing('tags');
                    const tags = await NoteAIService.generateTags(localNote.title, localNote.content);

                    setAiInsights(prev => [...prev, {
                        type: 'tags',
                        title: 'Suggested Tags',
                        content: tags,
                        timestamp: new Date(),
                    }]);
                    setShowAIPanel(true);

                    toast.success(`Generated ${tags.length} tags`);
                } catch (error) {
                    toast.error('Failed to generate tags');
                } finally {
                    stopAIProcessing();
                }
                break;

            case 'delete':
                if (window.confirm('Delete this note permanently?')) {
                    deleteNote(numericNoteId, {
                        onSuccess: () => navigate('/notes'),
                    });
                }
                break;
        }
    };

    // Handle saving AI insights to note
    const handleSaveToNote = (content: string) => {
        if (!localNote) return;
        updateContent(localNote.content + content);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-cyan-400" />
            </div>
        );
    }

    // Error state
    if (error || !note) {
        return (
            <div className="h-screen flex flex-col items-center justify-center">
                <AlertCircle className="h-16 w-16 text-red-400 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Note Not Found</h2>
                <button
                    onClick={() => navigate('/notes')}
                    className="synapse-button flex items-center gap-2"
                >
                    <ArrowLeft size={16} />
                    Back to Notes
                </button>
            </div>
        );
    }

    return (
        <div className="h-screen bg-background overflow-hidden flex flex-col relative">
            {/* Minimal Header */}
            <div className="flex items-center justify-between px-6 py-3 bg-background border-b border-border">
                <button
                    onClick={() => navigate('/notes')}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft size={16} />
                    <span className="font-medium">Back to Notes</span>
                </button>

                <div className="flex items-center gap-3">
                    {/* Status */}
                    {hasUnsavedChanges && (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Unsaved changes</span>
                    )}

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="Toggle theme"
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    {/* Split View Toggle */}
                    <button
                        onClick={() => setSplitView(!splitView)}
                        className={`p-2 rounded-lg transition-colors ${splitView
                                ? 'bg-primary/10 text-primary'
                                : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                            }`}
                        title="Toggle split view"
                    >
                        < Columns size={18} />
                    </button>

                    {/* Note Stats */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FileText size={12} />
                        <span>{localNote?.content?.split(/\s+/).length || 0} words</span>
                    </div>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-hidden">
                {splitView ? (
                    /* Split View: Edit + Preview */
                    <div className="h-full flex">
                        {/* Edit Pane */}
                        <div className="flex-1 overflow-y-auto border-r border-border">
                            <div className="max-w-3xl mx-auto px-12 py-8">
                                {mode === 'edit' && localNote && (
                                    <>
                                        <textarea
                                            ref={titleRef}
                                            value={localNote.title}
                                            onChange={(e) => updateTitle(e.target.value)}
                                            placeholder="Note title..."
                                            className="w-full bg-transparent text-4xl font-bold text-foreground placeholder:text-muted-foreground/40 border-none outline-none resize-none mb-6"
                                            rows={1}
                                        />
                                        <textarea
                                            ref={contentRef}
                                            value={localNote.content}
                                            onChange={(e) => updateContent(e.target.value)}
                                            placeholder="Start writing..."
                                            className="w-full bg-transparent text-base text-foreground/90 placeholder:text-muted-foreground/40 border-none outline-none resize-none font-serif leading-relaxed"
                                            style={{ minHeight: 'calc(100vh - 300px)' }}
                                        />
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Preview Pane */}
                        <div className="flex-1 overflow-y-auto bg-card">
                            <div className="max-w-3xl mx-auto px-12 py-8">
                                <h1 className="text-4xl font-bold text-foreground mb-6">
                                    {note.title || 'Untitled'}
                                </h1>
                                <div className="prose prose-lg dark:prose-invert max-w-none">
                                    <MarkdownPreview content={note.content || ''} />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Single View */
                    <div className="h-full overflow-y-auto">
                        <div className="max-w-4xl mx-auto px-20 py-12">
                            {mode === 'edit' && localNote ? (
                                <>
                                    <textarea
                                        ref={titleRef}
                                        value={localNote.title}
                                        onChange={(e) => updateTitle(e.target.value)}
                                        placeholder="Note title..."
                                        className="w-full bg-transparent text-5xl font-bold text-foreground placeholder:text-muted-foreground/40 border-none outline-none resize-none mb-8"
                                        rows={1}
                                    />
                                    <textarea
                                        ref={contentRef}
                                        value={localNote.content}
                                        onChange={(e) => updateContent(e.target.value)}
                                        placeholder="Start writing..."
                                        className="w-full bg-transparent text-lg text-foreground/90 placeholder:text-muted-foreground/40 border-none outline-none resize-none font-serif leading-relaxed"
                                        style={{ minHeight: 'calc(100vh - 300px)' }}
                                    />
                                </>
                            ) : (
                                <>
                                    <h1 className="text-5xl font-bold text-foreground mb-8">
                                        {note.title || 'Untitled'}
                                    </h1>
                                    <div className="prose prose-xl dark:prose-invert max-w-none">
                                        <MarkdownPreview content={note.content || ''} />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Toolbar */}
            <EditorToolbar
                mode={mode}
                onAction={handleAction}
                isProcessing={aiStatus.isProcessing}
                hasUnsavedChanges={hasUnsavedChanges}
                isSaving={isUpdating}
                textareaRef={contentRef}
            />

            {/* AI Insights Panel */}
            <AIInsightsPanel
                insights={aiInsights}
                isOpen={showAIPanel}
                onClose={() => setShowAIPanel(false)}
                onSaveToNote={handleSaveToNote}
            />

            {/* AI Processing Overlay */}
            <AnimatePresence>
                {aiStatus.isProcessing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center"
                    >
                        <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-4 shadow-2xl">
                            <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
                            <p className="text-sm font-medium text-gray-700">
                                {aiStatus.action === 'summarize' && 'Generating summary...'}
                                {aiStatus.action === 'tags' && 'Generating tags...'}
                                {aiStatus.action === 'expand' && 'Expanding content...'}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
