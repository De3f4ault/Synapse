import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Grid, List as ListIcon, Network, Loader2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

// Hooks
import { useNotes } from './hooks/useNotes';
import { useNoteTree } from './hooks/useNoteTree';

// Components
import { NoteTree } from './components/list/NoteTree';
import { NoteCard } from './components/list/NoteCard';
import { NoteSearch } from './components/list/NoteSearch';
import { NoteStats } from './components/shared/NoteStats';

type ViewMode = 'tree' | 'grid' | 'list';

/**
 * NotesPage - Main notes hub with tree/grid/list views
 *
 * Features:
 * - Hierarchical tree view with expand/collapse
 * - Grid and list view modes
 * - Real-time search filtering
 * - Statistics dashboard
 * - Create new notes
 */
export function NotesPage() {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<ViewMode>('tree');

    // Fetch notes
    const { notes, isLoading, createNote, deleteNote, isCreating } = useNotes();

    // Tree state management
    const {
        filteredTree,
        expandedFolders,
        searchQuery,
        setSearchQuery,
        toggleFolder,
        expandAll,
        collapseAll,
    } = useNoteTree(notes);

    const [selectedId, setSelectedId] = useState<number | null>(null);

    // Handlers
    const handleCreateNote = () => {
        createNote(
            {
                requestBody: {
                    title: 'New Fragment',
                    content: '',
                    tags: [],
                },
            },
            {
                onSuccess: (data) => {
                    navigate(`/notes/${data.id}`);
                },
            }
        );
    };

    const handleSelectNote = (id: number) => {
        setSelectedId(id);
        navigate(`/notes/${id}`);
    };

    const handleDeleteNote = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Archive this fragment permanently?')) {
            deleteNote(id);
        }
    };

    return (
        <div className="relative w-full min-h-screen bg-[#020408] text-slate-200 font-sans overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/30 via-[#020408] to-black opacity-70" />

        {/* Main Content */}
        <div className="relative z-10 p-8 overflow-y-auto custom-scrollbar h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
        <div>
        <h1 className="text-4xl font-serif font-bold text-white mb-2 tracking-tight">
        Neural Codex
        </h1>
        <p className="text-slate-500 font-mono text-xs tracking-[0.25em] uppercase">
        Knowledge Fragment Archive
        </p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
        {/* Search */}
        <NoteSearch
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="SEARCH FRAGMENTS..."
        />

        {/* View Mode Toggle */}
        <div className="flex bg-black/40 border border-white/10 rounded-lg p-1">
        <button
        onClick={() => setViewMode('tree')}
        className={cn(
            'p-2 rounded transition-all',
            viewMode === 'tree'
            ? 'bg-cyan-500 text-black'
            : 'text-slate-500 hover:text-white'
        )}
        title="Tree View"
        >
        <Network size={18} />
        </button>
        <button
        onClick={() => setViewMode('grid')}
        className={cn(
            'p-2 rounded transition-all',
            viewMode === 'grid'
            ? 'bg-cyan-500 text-black'
            : 'text-slate-500 hover:text-white'
        )}
        title="Grid View"
        >
        <Grid size={18} />
        </button>
        <button
        onClick={() => setViewMode('list')}
        className={cn(
            'p-2 rounded transition-all',
            viewMode === 'list'
            ? 'bg-cyan-500 text-black'
            : 'text-slate-500 hover:text-white'
        )}
        title="List View"
        >
        <ListIcon size={18} />
        </button>
        </div>

        {/* Create Button */}
        <button
        onClick={handleCreateNote}
        disabled={isCreating}
        className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-white transition-all uppercase tracking-[0.15em] group whitespace-nowrap disabled:opacity-50"
        >
        {isCreating ? (
            <Loader2 size={14} className="animate-spin" />
        ) : (
            <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300 text-cyan-500" />
        )}
        New Fragment
        </button>
        </div>
        </div>

        {/* Stats */}
        {notes && notes.length > 0 && (
            <div className="mb-8">
            <NoteStats notes={notes} />
            </div>
        )}

        {/* Loading State */}
        {isLoading && (
            <div className="flex flex-col items-center justify-center py-32">
            <div className="relative">
            <div className="w-16 h-16 rounded-full border-t-4 border-cyan-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
            <FileText size={24} className="text-cyan-500 animate-pulse" />
            </div>
            </div>
            <p className="mt-6 text-cyan-500 font-mono text-xs tracking-[0.3em] animate-pulse uppercase">
            Loading Fragments...
            </p>
            </div>
        )}

        {/* Empty State */}
        {!isLoading && (!notes || notes.length === 0) && (
            <div className="flex flex-col items-center justify-center py-32 border border-white/5 border-dashed rounded-2xl bg-white/[0.02]">
            <FileText className="w-16 h-16 text-slate-600 mb-6 opacity-50" />
            <h3 className="text-xl font-serif font-bold text-white mb-2">
            No Fragments Detected
            </h3>
            <p className="text-slate-500 font-mono text-xs tracking-[0.2em] uppercase mb-6">
            Initialize Your First Neural Fragment
            </p>
            <button
            onClick={handleCreateNote}
            disabled={isCreating}
            className="px-6 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-300 text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50"
            >
            {isCreating ? (
                <Loader2 size={14} className="animate-spin" />
            ) : (
                <Plus size={14} />
            )}
            Create Fragment
            </button>
            </div>
        )}

        {/* Content Views */}
        {!isLoading && notes && notes.length > 0 && (
            <AnimatePresence mode="wait">
            {viewMode === 'tree' && (
                <motion.div
                key="tree"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white/5 border border-white/10 rounded-xl p-6"
                >
                <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-mono text-cyan-400 uppercase tracking-wider">
                Fragment Hierarchy
                </h2>
                <div className="flex gap-2">
                <button
                onClick={expandAll}
                className="text-xs text-slate-500 hover:text-cyan-400 transition-colors"
                >
                Expand All
                </button>
                <span className="text-slate-700">|</span>
                <button
                onClick={collapseAll}
                className="text-xs text-slate-500 hover:text-cyan-400 transition-colors"
                >
                Collapse All
                </button>
                </div>
                </div>
                <NoteTree
                items={filteredTree}
                selectedId={selectedId}
                expandedIds={expandedFolders}
                toggleExpand={toggleFolder}
                onSelect={handleSelectNote}
                onDelete={handleDeleteNote}
                />
                </motion.div>
            )}

            {viewMode === 'grid' && (
                <motion.div
                key="grid"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                {notes.map((note, index) => (
                    <NoteCard
                    key={note.id}
                    note={note}
                    onClick={() => handleSelectNote(note.id)}
                    index={index}
                    />
                ))}
                </motion.div>
            )}

            {viewMode === 'list' && (
                <motion.div
                key="list"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-2"
                >
                {notes.map((note, index) => (
                    <NoteCard
                    key={note.id}
                    note={note}
                    onClick={() => handleSelectNote(note.id)}
                    index={index}
                    />
                ))}
                </motion.div>
            )}
            </AnimatePresence>
        )}
        </div>
        </div>
    );
}
