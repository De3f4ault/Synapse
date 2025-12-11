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
        <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                        Notes
                    </h1>
                    <p className="text-slate-400 font-mono text-xs tracking-wider uppercase">
                        Manage your knowledge fragments
                    </p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    {/* Search */}
                    <div className="w-full md:w-64">
                        <NoteSearch
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search notes..."
                        />
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex bg-white/5 border border-white/5 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('tree')}
                            className={cn(
                                'p-2 rounded transition-all',
                                viewMode === 'tree'
                                    ? 'bg-cyan-500/20 text-cyan-400'
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
                                    ? 'bg-cyan-500/20 text-cyan-400'
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
                                    ? 'bg-cyan-500/20 text-cyan-400'
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
                        className="synapse-button whitespace-nowrap"
                    >
                        {isCreating ? (
                            <Loader2 size={14} className="animate-spin mr-2" />
                        ) : (
                            <Plus size={14} className="mr-2" />
                        )}
                        New Note
                    </button>
                </div>
            </div>

            {/* Stats */}
            {notes && notes.length > 0 && (
                <div className="shrink-0">
                    <NoteStats notes={notes} />
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                {/* Loading State */}
                {isLoading && (
                    <div className="flex flex-col items-center justify-center h-full">
                        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                        <p className="text-slate-400 font-mono text-sm uppercase tracking-wider">
                            Loading Notes...
                        </p>
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && (!notes || notes.length === 0) && (
                    <div className="flex flex-col items-center justify-center h-full border border-white/5 border-dashed rounded-xl bg-white/[0.02]">
                        <FileText className="w-16 h-16 text-slate-700 mb-6" />
                        <h3 className="text-xl font-bold text-white mb-2">
                            No Notes Found
                        </h3>
                        <p className="text-slate-500 font-mono text-xs tracking-wider uppercase mb-6">
                            Create your first note to get started
                        </p>
                        <button
                            onClick={handleCreateNote}
                            disabled={isCreating}
                            className="synapse-button"
                        >
                            {isCreating ? (
                                <Loader2 size={14} className="animate-spin mr-2" />
                            ) : (
                                <Plus size={14} className="mr-2" />
                            )}
                            Create Note
                        </button>
                    </div>
                )}

                {/* Content Views */}
                {!isLoading && notes && notes.length > 0 && (
                    <AnimatePresence mode="wait">
                        {viewMode === 'tree' && (
                            <motion.div
                                key="tree"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="synapse-panel p-6"
                            >
                                <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-4">
                                    <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                                        Directory Structure
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
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
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
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
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
