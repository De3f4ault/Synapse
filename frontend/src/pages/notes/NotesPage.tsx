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
import { NoteStats } from './components/shared/NoteStats';
import { FloatingPageDock } from '@/components/layout/FloatingPageDock';

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
                title: 'New Fragment',
                content: ' ', // Backend requires min 1 char
                tags: [],
            },
            {
                onSuccess: (data: any) => {
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
        <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col bg-background">
            {/* Stats Section */}
            {notes && notes.length > 0 && (
                <div className="shrink-0 px-6 pt-6">
                    <NoteStats notes={notes} />
                </div>
            )}

            {/* Floating Page Dock with Search & Controls */}
            <div className="shrink-0 px-6 pt-4">
                <FloatingPageDock className="justify-between">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                            <FileText size={16} />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            placeholder="Search notes..."
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-10 bg-transparent border-none outline-none pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus:ring-0"
                        />
                    </div>

                    <div className="h-6 w-px bg-border mx-2" />

                    {/* View Toggles */}
                    <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1 border border-border">
                        <button
                            onClick={() => setViewMode('tree')}
                            className={cn("p-2 rounded-full transition-all", viewMode === 'tree' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
                            title="Tree View"
                        >
                            <Network size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn("p-2 rounded-full transition-all", viewMode === 'grid' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
                            title="Grid View"
                        >
                            <Grid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn("p-2 rounded-full transition-all", viewMode === 'list' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
                            title="List View"
                        >
                            <ListIcon size={16} />
                        </button>
                    </div>

                    <div className="h-6 w-px bg-border mx-2" />

                    {/* Create Button */}
                    <button
                        onClick={handleCreateNote}
                        disabled={isCreating}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                    >
                        {isCreating ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Plus size={16} />
                        )}
                        <span className="text-sm font-medium">New Note</span>
                    </button>
                </FloatingPageDock>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
                {isLoading ? (
                    <div className="h-64 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : notes && notes.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-center">
                        <FileText size={48} className="text-muted-foreground/30 mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No notes yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">Create your first note to get started</p>
                        <button
                            onClick={handleCreateNote}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-all"
                        >
                            <Plus size={16} />
                            <span className="text-sm font-medium">Create Note</span>
                        </button>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={viewMode}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {viewMode === 'tree' && filteredTree && (
                                <div className="bg-card border border-border rounded-lg p-6">
                                    <div className="flex justify-between items-center mb-4 border-b border-border pb-4">
                                        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                                            Notes Structure
                                        </h2>
                                        <div className="flex gap-2 text-xs">
                                            <button
                                                onClick={expandAll}
                                                className="text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                Expand All
                                            </button>
                                            <span className="text-border">|</span>
                                            <button
                                                onClick={collapseAll}
                                                className="text-muted-foreground hover:text-primary transition-colors"
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
                                </div>
                            )}

                            {viewMode === 'grid' && notes && (
                                <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
                                    {notes.map((note: any, index: number) => (
                                        <div key={note.id} className="break-inside-avoid mb-4">
                                            <NoteCard
                                                note={note}
                                                onClick={() => handleSelectNote(note.id)}
                                                index={index}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {viewMode === 'list' && notes && (
                                <div className="space-y-3 max-w-4xl">
                                    {notes.map((note: any, index: number) => (
                                        <NoteCard
                                            key={note.id}
                                            note={note}
                                            onClick={() => handleSelectNote(note.id)}
                                            index={index}
                                        />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
