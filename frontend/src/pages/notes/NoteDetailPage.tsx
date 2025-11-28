import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    getNoteApiV1NotesNoteIdGet,
    updateNoteApiV1NotesNoteIdPut,
    deleteNoteApiV1NotesNoteIdDelete
} from '@/api/generated/services.gen';
import { queryKeys } from '@/lib/queryKeys';
import {
    Clock, Hash, Edit3, Eye, Bold, Italic,
    List, Code, Bot, Tag, Save, Loader2, Share2,
    MoreVertical, Trash2, ChevronRight, Sparkles,
    Brain, Zap, CornerDownRight, X, Check
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

// TODO: Implement AI Features
// File: src/api/services/gemini.ts
// - Neural Synthesis (summarization)
// - Auto-tagging system
// - Content expansion
// - Grammar correction
const mockAiSummarize = async (text: string) => {
    await new Promise(r => setTimeout(r, 2000));
    return "Neural synthesis: The system operates within optimal parameters. Knowledge infrastructure is stable.";
};

const mockAiTags = async (text: string) => {
    await new Promise(r => setTimeout(r, 1500));
    return ['AI', 'System', 'Neural'];
};

/**
 * Protocol: ARCHIVE - HoloEditor Interface
 *
 * Features:
 * - Transparent glass morphic editing surface
 * - Floating tool dock with AI assistance
 * - Auto-saving with optimistic updates
 * - Edit/View mode toggling
 * - Rich formatting toolbar (edit mode only)
 * - Neural synthesis AI integration
 * - Auto-tagging system
 * - Breadcrumb navigation
 * - Share and delete actions
 */

export function NoteDetailPage() {
    const { noteId } = useParams<{ noteId: string }>();
    const navigate = useNavigate();
    const id = parseInt(noteId || '0', 10);
    const queryClient = useQueryClient();

    // Local State
    const [isEditing, setIsEditing] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const titleRef = useRef<HTMLInputElement>(null);

    // Local form state for optimistic updates
    const [localNote, setLocalNote] = useState<{ title: string; content: string; tags?: string[] } | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Fetch Note
    const { data: note, isLoading } = useQuery({
        queryKey: queryKeys.notes.detail(id),
                                               queryFn: () => getNoteApiV1NotesNoteIdGet({ noteId: id }),
                                               enabled: !!id,
    });

    // Sync local state when note loads
    useEffect(() => {
        if (note) {
            setLocalNote({
                title: note.title,
                content: note.content || '',
                tags: note.tags || []
            });
            setHasUnsavedChanges(false);
        }
    }, [note]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [localNote?.content]);

    // Track unsaved changes
    useEffect(() => {
        if (note && localNote) {
            const changed =
            localNote.title !== note.title ||
            localNote.content !== (note.content || '');
            setHasUnsavedChanges(changed);
        }
    }, [localNote, note]);

    // Update Mutation
    const { mutate: saveNote } = useMutation({
        mutationFn: () => {
            if (!localNote) throw new Error('No local note data');
            return updateNoteApiV1NotesNoteIdPut({
                noteId: id,
                requestBody: {
                    title: localNote.title,
                    content: localNote.content,
                    tags: localNote.tags,
                }
            });
        },
        onMutate: () => setIsSaving(true),
                                             onSuccess: () => {
                                                 queryClient.invalidateQueries({ queryKey: queryKeys.notes.detail(id) });
                                                 queryClient.invalidateQueries({ queryKey: queryKeys.notes.list() });
                                                 setHasUnsavedChanges(false);
                                                 toast.success('ARTIFACT SYNCHRONIZED');
                                             },
                                             onError: (error) => {
                                                 toast.error('SYNC FAILED', {
                                                     description: error instanceof Error ? error.message : 'Unknown error',
                                                 });
                                             },
                                             onSettled: () => setIsSaving(false),
    });

    // Delete Mutation
    const { mutate: deleteNote } = useMutation({
        mutationFn: () => deleteNoteApiV1NotesNoteIdDelete({ noteId: id }),
                                               onSuccess: () => {
                                                   queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
                                                   toast.success('FRAGMENT ARCHIVED');
                                                   navigate('/notes');
                                               },
                                               onError: (error) => {
                                                   toast.error('ARCHIVE FAILED', {
                                                       description: error instanceof Error ? error.message : 'Unknown error',
                                                   });
                                               },
    });

    // Action Handlers
    const handleAction = async (action: string) => {
        if (action === 'toggle_edit') {
            setIsEditing(!isEditing);
        }

        if (action === 'save') {
            if (hasUnsavedChanges) {
                saveNote();
            } else {
                toast.info('No changes to sync');
            }
        }

        if (action === 'ai_summarize' && localNote) {
            setIsProcessing(true);
            try {
                // TODO: Replace with actual Gemini API call
                const summary = await mockAiSummarize(localNote.content);
                const newContent = localNote.content + `\n\n---\n\n**NEURAL SYNTHESIS:**\n${summary}`;
                setLocalNote(prev => prev ? { ...prev, content: newContent } : null);
                setHasUnsavedChanges(true);
                toast.success('SYNTHESIS COMPLETE');
            } catch (e) {
                toast.error('NEURAL LINK FAILURE');
            }
            setIsProcessing(false);
        }

        if (action === 'ai_tags' && localNote) {
            setIsProcessing(true);
            try {
                // TODO: Replace with actual Gemini API call
                const newTags = await mockAiTags(localNote.content);
                setLocalNote(prev => prev ? {
                    ...prev,
                    tags: [...new Set([...(prev.tags || []), ...newTags])]
                } : null);
                setHasUnsavedChanges(true);
                toast.success('TAGS GENERATED');
            } catch (e) {
                toast.error('TAG GENERATION FAILED');
            }
            setIsProcessing(false);
        }

        if (action === 'delete') {
            if (confirm('Archive this neural fragment permanently? This cannot be undone.')) {
                deleteNote();
            }
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Cmd/Ctrl + S to save
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                handleAction('save');
            }
            // Cmd/Ctrl + E to toggle edit
            if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
                e.preventDefault();
                handleAction('toggle_edit');
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [hasUnsavedChanges]);

    const removeTag = (tagToRemove: string) => {
        setLocalNote(prev => prev ? {
            ...prev,
            tags: prev.tags?.filter(t => t !== tagToRemove) || []
        } : null);
        setHasUnsavedChanges(true);
    };

    if (isLoading || !localNote) {
        return (
            <div className="h-full flex flex-col items-center justify-center">
            <div className="relative">
            <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
            <Brain size={24} className="absolute inset-0 m-auto text-cyan-500 animate-pulse" />
            </div>
            <p className="mt-4 text-xs font-mono text-slate-500 uppercase tracking-wider">
            Loading Fragment...
            </p>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full flex flex-col">
        {/* Top Bar - Navigation & Actions */}
        <div className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-black/10 backdrop-blur-sm z-20 relative">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
        <span className="opacity-50">root</span>
        <ChevronRight size={12} />
        <span className="opacity-50">...</span>
        <ChevronRight size={12} />
        <span className="text-cyan-500 flex items-center gap-2">
        {localNote.title}
        {hasUnsavedChanges && (
            <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-1.5 h-1.5 bg-amber-500 rounded-full"
            />
        )}
        </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
        {/* Save Indicator */}
        <AnimatePresence>
        {isSaving && (
            <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex items-center gap-2 text-xs font-mono text-cyan-500"
            >
            <Loader2 size={14} className="animate-spin" />
            SYNCING...
            </motion.div>
        )}
        </AnimatePresence>

        <button
        className="p-2 hover:bg-white/5 rounded-md text-slate-500 hover:text-white transition-colors"
        title="Share Fragment"
        >
        <Share2 size={18} />
        </button>

        <DropdownMenu>
        <DropdownMenuTrigger asChild>
        <button className="p-2 hover:bg-white/5 rounded-md text-slate-500 hover:text-white transition-colors">
        <MoreVertical size={18} />
        </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-[#0a0c12] border-white/10">
        <DropdownMenuItem onClick={() => handleAction('save')} className="text-white">
        <Save className="mr-2 h-4 w-4" />
        Save Changes
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/5" />
        <DropdownMenuItem
        onClick={() => handleAction('delete')}
        className="text-red-400 focus:text-red-300"
        >
        <Trash2 className="mr-2 h-4 w-4" />
        Archive Fragment
        </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
        </div>
        </div>

        {/* HoloEditor Surface */}
        <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar p-8 md:p-16 pb-32">
        {/* Glass Sheet Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-white/[0.01] to-transparent pointer-events-none" />

        {/* Maximum Width Container */}
        <div className="max-w-4xl mx-auto relative z-10">
        {/* Title Area */}
        <div className="mb-8 border-b border-white/5 pb-6">
        <input
        ref={titleRef}
        value={localNote.title}
        onChange={(e) => {
            setLocalNote({ ...localNote, title: e.target.value });
            setHasUnsavedChanges(true);
        }}
        className="w-full bg-transparent text-4xl md:text-5xl font-serif text-white placeholder:text-slate-700 outline-none font-bold tracking-tight"
        placeholder="Untitled Artifact"
        disabled={!isEditing}
        spellCheck={false}
        />

        {/* Metadata Row */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
        {/* Timestamp */}
        <span className="flex items-center gap-1.5 text-xs font-mono text-cyan-500/60 bg-cyan-950/20 px-2 py-1 rounded border border-cyan-900/30">
        <Clock size={10} />
        {note?.updated_at ? format(new Date(note.updated_at), 'MMM d, HH:mm') : 'Unsaved'}
        </span>

        {/* Tags */}
        {localNote.tags && localNote.tags.map(tag => (
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
                onClick={() => removeTag(tag)}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity ml-1"
                >
                <X size={10} />
                </button>
            )}
            </motion.span>
        ))}
        </div>
        </div>

        {/* Main Content Editor */}
        <textarea
        ref={textareaRef}
        value={localNote.content}
        onChange={(e) => {
            setLocalNote({ ...localNote, content: e.target.value });
            setHasUnsavedChanges(true);
        }}
        className={cn(
            "w-full bg-transparent outline-none text-lg leading-relaxed resize-none font-serif text-slate-300 placeholder:text-slate-700 min-h-[500px] selection:bg-cyan-500/30",
            !isEditing && 'cursor-default'
        )}
        placeholder="Initialize thought sequence...

        ## Neural Pathways

        Start documenting your knowledge architecture here. The system supports markdown formatting for optimal clarity.

        - Bullet points for structured lists
        - **Bold** for emphasis
        - `Code blocks` for technical notation

        Begin transmission..."
        spellCheck={false}
        disabled={!isEditing}
        />
        </div>
        </div>

        {/* Floating Tool Dock */}
        <ToolDock
        onAction={handleAction}
        isEditing={isEditing}
        isProcessing={isProcessing}
        hasUnsavedChanges={hasUnsavedChanges}
        />
        </div>
    );
}

/**
 * Tool Dock - Floating Action Pill
 */
interface ToolDockProps {
    onAction: (action: string) => void;
    isEditing: boolean;
    isProcessing: boolean;
    hasUnsavedChanges: boolean;
}

const ToolDock = ({ onAction, isEditing, isProcessing, hasUnsavedChanges }: ToolDockProps) => {
    return (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
        <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-1 p-1.5 bg-[#080a0e]/95 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl shadow-black/50"
        >
        {/* Edit Toggle */}
        <div className="flex items-center gap-1 px-2 border-r border-white/10">
        <button
        onClick={() => onAction('toggle_edit')}
        className={cn(
            "p-3 rounded-full transition-all relative group",
            isEditing
            ? "bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            : "text-slate-500 hover:text-white hover:bg-white/5"
        )}
        title={isEditing ? "View Mode (⌘E)" : "Edit Mode (⌘E)"}
        >
        {isEditing ? <Edit3 size={18} /> : <Eye size={18} />}
        <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        </div>

        {/* Formatting Tools (Edit Mode Only) */}
        <AnimatePresence>
        {isEditing && (
            <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1 px-2 overflow-hidden"
            >
            <button className="p-2.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-full transition-colors" title="Bold">
            <Bold size={16} />
            </button>
            <button className="p-2.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-full transition-colors" title="Italic">
            <Italic size={16} />
            </button>
            <button className="p-2.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-full transition-colors" title="List">
            <List size={16} />
            </button>
            <button className="p-2.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-full transition-colors" title="Code">
            <Code size={16} />
            </button>
            </motion.div>
        )}
        </AnimatePresence>

        {/* AI Actions */}
        <div className="flex items-center gap-1 px-2 border-l border-white/10">
        <button
        onClick={() => onAction('ai_summarize')}
        className="p-2.5 text-slate-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-full transition-colors group relative"
        title="Neural Synthesis"
        disabled={isProcessing}
        >
        {isProcessing ? (
            <Loader2 size={18} className="animate-spin text-purple-500" />
        ) : (
            <Bot size={18} />
        )}
        <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        <button
        onClick={() => onAction('ai_tags')}
        className="p-2.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-full transition-colors group relative"
        title="Auto-Tag"
        disabled={isProcessing}
        >
        <Tag size={18} />
        <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        </div>

        {/* Save Action */}
        <motion.button
        onClick={() => onAction('save')}
        className={cn(
            "ml-2 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-all",
            hasUnsavedChanges
            ? "bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/50 hover:scale-105 active:scale-95"
            : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/50"
        )}
        animate={hasUnsavedChanges ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
        title={hasUnsavedChanges ? "Save Changes (⌘S)" : "All Changes Saved"}
        >
        {hasUnsavedChanges ? <Save size={18} /> : <Check size={18} />}
        </motion.button>
        </motion.div>
        </div>
    );
};
