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
import { NeumorphicButton } from '@/components/neumorphic';

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
            <div className="min-h-screen flex items-center justify-center nm-bg nm-constellation-bg">
                <Loader2 className="h-12 w-12 animate-spin text-cyan-400" />
            </div>
        );
    }

    // Error state
    if (error || !note) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center nm-bg nm-constellation-bg">
                <AlertCircle className="h-16 w-16 text-red-400 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Note Not Found</h2>
                <NeumorphicButton
                    variant="primary"
                    onClick={() => navigate('/notes')}
                    className="flex items-center gap-2"
                >
                    <ArrowLeft size={16} />
                    Back to Notes
                </NeumorphicButton>
            </div>
        );
    }

    return (
        <div className="relative h-screen nm-bg nm-constellation-bg overflow-hidden flex flex-col">
            {/* Minimal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#13151a]/50 backdrop-blur-md z-10">
                <button
                    onClick={() => navigate('/notes')}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group"
                >
                    <div className="p-1 rounded-lg group-hover:bg-white/10 transition-colors">
                        <ArrowLeft size={16} />
                    </div>
                    <span className="font-medium">Back to Notes</span>
                </button>

                <div className="flex items-center gap-3">
                    {/* Status */}
                    {hasUnsavedChanges && (
                        <span className="text-xs text-amber-400 font-medium bg-amber-400/10 px-2 py-1 rounded-md border border-amber-400/20">Unsaved changes</span>
                    )}

                    {/* Split View Toggle */}
                    <NeumorphicButton
                        variant={splitView ? 'primary' : 'ghost'}
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => setSplitView(!splitView)}
                        title="Toggle split view"
                    >
                        <Columns size={16} />
                    </NeumorphicButton>

                    {/* Note Stats */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                        <FileText size={12} />
                        <span>{localNote?.content?.split(/\s+/).length || 0} words</span>
                    </div>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-hidden relative">
                {splitView ? (
                    /* Split View: Edit + Preview */
                    <div className="h-full flex">
                        {/* Edit Pane */}
                        <div className="flex-1 overflow-y-auto border-r border-white/5 scrollbar-hide">
                            <div className="max-w-3xl mx-auto px-12 py-8 pb-32">
                                {mode === 'edit' && localNote && (
                                    <>
                                        <textarea
                                            ref={titleRef}
                                            value={localNote.title}
                                            onChange={(e) => updateTitle(e.target.value)}
                                            placeholder="Note title..."
                                            className="w-full bg-transparent text-4xl font-bold text-white placeholder:text-slate-600 border-none outline-none resize-none mb-6 caret-cyan-400"
                                            rows={1}
                                        />
                                        <textarea
                                            ref={contentRef}
                                            value={localNote.content}
                                            onChange={(e) => updateContent(e.target.value)}
                                            placeholder="Start writing..."
                                            className="w-full bg-transparent text-base text-slate-300 placeholder:text-slate-700 border-none outline-none resize-none font-serif leading-relaxed caret-cyan-400"
                                            style={{ minHeight: 'calc(100vh - 300px)' }}
                                            spellCheck={false}
                                        />
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Preview Pane */}
                        <div className="flex-1 overflow-y-auto bg-black/20 scrollbar-hide">
                            <div className="max-w-3xl mx-auto px-12 py-8 pb-32">
                                <h1 className="text-4xl font-bold text-white mb-6">
                                    {note.title || 'Untitled'}
                                </h1>
                                <div className="prose prose-lg prose-invert max-w-none prose-headings:text-slate-200 prose-p:text-slate-400 prose-strong:text-white prose-code:text-cyan-300">
                                    <MarkdownPreview content={note.content || ''} />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Single View */
                    <div className="h-full overflow-y-auto scrollbar-hide">
                        <div className="max-w-4xl mx-auto px-20 py-12 pb-40">
                            {mode === 'edit' && localNote ? (
                                <>
                                    <textarea
                                        ref={titleRef}
                                        value={localNote.title}
                                        onChange={(e) => updateTitle(e.target.value)}
                                        placeholder="Note title..."
                                        className="w-full bg-transparent text-5xl font-bold text-white placeholder:text-slate-600 border-none outline-none resize-none mb-8 caret-cyan-400"
                                        rows={1}
                                    />
                                    <textarea
                                        ref={contentRef}
                                        value={localNote.content}
                                        onChange={(e) => updateContent(e.target.value)}
                                        placeholder="Start writing..."
                                        className="w-full bg-transparent text-lg text-slate-300 placeholder:text-slate-700 border-none outline-none resize-none font-serif leading-relaxed caret-cyan-400"
                                        style={{ minHeight: 'calc(100vh - 300px)' }}
                                        spellCheck={false}
                                    />
                                </>
                            ) : (
                                <>
                                    <h1 className="text-5xl font-bold text-white mb-8">
                                        {note.title || 'Untitled'}
                                    </h1>
                                    <div className="prose prose-xl prose-invert max-w-none prose-headings:text-slate-200 prose-p:text-slate-400 prose-strong:text-white prose-code:text-cyan-300">
                                        <MarkdownPreview content={note.content || ''} />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Toolbar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
                <EditorToolbar
                    mode={mode}
                    onAction={handleAction}
                    isProcessing={aiStatus.isProcessing}
                    hasUnsavedChanges={hasUnsavedChanges}
                    isSaving={isUpdating}
                    textareaRef={contentRef}
                />
            </div>

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
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
                    >
                        <div className="bg-[#1e2024] border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
                            <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
                            <p className="text-sm font-medium text-slate-300">
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
