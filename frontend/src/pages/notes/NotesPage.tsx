import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    listNotesApiV1NotesGet,
    createNoteApiV1NotesPost,
    deleteNoteApiV1NotesNoteIdDelete
} from '@/api/generated/services.gen';
import { queryKeys } from '@/lib/queryKeys';
import {
    Search, Database, Settings, ChevronRight, ChevronDown,
    Folder, FolderOpen, FileText, Loader2, Plus,
    CornerDownLeft, Sparkles, Network, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { NoteResponse } from '@/api/generated/types.gen';
import { NoteDetailPage } from './NoteDetailPage';

/**
 * Protocol: ARCHIVE - Neural Knowledge Repository
 *
 * Features:
 * - Hierarchical neural tree with animated expansion
 * - Glass morphic sidebar with backdrop blur
 * - Real-time search filtering
 * - Collapsible navigation
 * - Ambient grid connections
 * - Sync status indicator
 * - Quick note creation
 */

export function NotesPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { noteId } = useParams<{ noteId: string }>();

    const [searchQuery, setSearchQuery] = useState('');
    const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Fetch all notes
    const { data: notes, isLoading } = useQuery({
        queryKey: queryKeys.notes.list(),
                                                queryFn: () => listNotesApiV1NotesGet(),
    });

    // Create note mutation
    const { mutate: createNote } = useMutation({
        mutationFn: createNoteApiV1NotesPost,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
            toast.success('NEURAL NODE INITIALIZED');
            navigate(`/notes/${data.id}`);
        },
        onError: (error) => {
            toast.error('INITIALIZATION FAILED', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
    });

    // Delete note mutation
    const { mutate: deleteNote } = useMutation({
        mutationFn: (id: number) => deleteNoteApiV1NotesNoteIdDelete({ noteId: id }),
                                               onSuccess: () => {
                                                   queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
                                                   toast.success('NODE ARCHIVED');
                                                   if (noteId) navigate('/notes');
                                               },
                                               onError: (error) => {
                                                   toast.error('ARCHIVE FAILED', {
                                                       description: error instanceof Error ? error.message : 'Unknown error',
                                                   });
                                               },
    });

    // Build hierarchical tree structure
    const noteTree = useMemo(() => {
        if (!notes) return [];

        const tree: (NoteResponse & { children?: NoteResponse[] })[] = [];
        const map = new Map<number, NoteResponse & { children?: NoteResponse[] }>();

        // Initialize map with children arrays
        notes.forEach(note => {
            map.set(note.id, { ...note, children: [] });
        });

        // Build hierarchy
        notes.forEach(note => {
            const node = map.get(note.id)!;
            if (note.parent_id && map.has(note.parent_id)) {
                map.get(note.parent_id)!.children!.push(node);
            } else {
                tree.push(node);
            }
        });

        return tree;
    }, [notes]);

    // Filter notes by search query
    const filteredTree = useMemo(() => {
        if (!searchQuery.trim()) return noteTree;

        const filterRecursive = (items: any[]): any[] => {
            return items.reduce((acc, item) => {
                const matchesSearch = item.title?.toLowerCase().includes(searchQuery.toLowerCase());
                const filteredChildren = item.children ? filterRecursive(item.children) : [];

                if (matchesSearch || filteredChildren.length > 0) {
                    acc.push({
                        ...item,
                        children: filteredChildren,
                    });
                }

                return acc;
            }, []);
        };

        return filterRecursive(noteTree);
    }, [noteTree, searchQuery]);

    const handleSelectNote = (id: number) => {
        navigate(`/notes/${id}`);
    };

    const toggleFolder = (id: number) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleCreateNote = () => {
        createNote({
            requestBody: {
                title: 'Untitled Fragment',
                content: '',
                parent_id: noteId ? parseInt(noteId) : undefined,
            },
        });
    };

    const handleDeleteNote = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Archive this neural fragment? This action cannot be undone.')) {
            deleteNote(id);
        }
    };

    return (
        <div className="w-full h-screen bg-[#020408] text-slate-200 font-sans flex overflow-hidden selection:bg-cyan-500/30 relative">
        {/* Ambient Background Effects */}
        <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/30 via-[#020408] to-black" />
        <div className="absolute inset-0 z-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none" />

        {/* Neural Grid Pattern (subtle) */}
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
        }} />
        </div>

        {/* Sidebar - Neural Tree */}
        <AnimatePresence>
        {sidebarOpen && (
            <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-80 h-full border-r border-white/5 bg-black/20 backdrop-blur-xl flex-shrink-0 overflow-hidden relative z-20 flex flex-col"
            >
            {/* Sidebar Header */}
            <div className="p-6 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3 mb-6">
            <div className="relative">
            <Database size={24} className="text-cyan-400" />
            <motion.div
            className="absolute inset-0 bg-cyan-500/20 rounded-full blur-md"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            />
            </div>
            <div>
            <span className="font-serif text-xl tracking-[0.2em] font-bold text-white uppercase">
            Archive
            </span>
            <p className="text-[9px] font-mono text-slate-500 tracking-wider uppercase">
            Neural Repository
            </p>
            </div>
            </div>

            {/* Search & New Note */}
            <div className="flex gap-2">
            <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-500 transition-colors" size={14} />
            <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH PATHS..."
            className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-9 pr-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-700 uppercase tracking-wider"
            />
            </div>
            <button
            onClick={handleCreateNote}
            className="p-2.5 bg-white/5 border border-white/10 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-500/30 transition-all group"
            title="Initialize Node"
            >
            <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
            </div>
            </div>

            {/* Tree List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                <div className="w-12 h-12 rounded-full border-t-2 border-cyan-500 animate-spin" />
                <Network size={20} className="absolute inset-0 m-auto text-cyan-500 animate-pulse" />
                </div>
                <p className="mt-4 text-xs font-mono text-slate-500 uppercase tracking-wider">
                Syncing Archive...
                </p>
                </div>
            ) : filteredTree.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="w-12 h-12 text-slate-700 mb-4" />
                <p className="text-sm font-mono text-slate-600 uppercase tracking-wider mb-2">
                {searchQuery ? 'No Matches Found' : 'Archive Empty'}
                </p>
                {!searchQuery && (
                    <button
                    onClick={handleCreateNote}
                    className="mt-4 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 text-xs font-mono uppercase tracking-wider transition-all"
                    >
                    <Plus className="inline mr-1 h-3 w-3" />
                    Create Fragment
                    </button>
                )}
                </div>
            ) : (
                <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ staggerChildren: 0.03 }}
                >
                {filteredTree.map((item) => (
                    <NeuralItem
                    key={item.id}
                    item={item}
                    level={0}
                    selectedId={noteId ? parseInt(noteId) : null}
                    expandedIds={expandedFolders}
                    toggleExpand={toggleFolder}
                    onSelect={handleSelectNote}
                    onDelete={handleDeleteNote}
                    />
                ))}
                </motion.div>
            )}
            </div>

            {/* Footer - Sync Status */}
            <div className="p-4 border-t border-white/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
            <div className="relative">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            <motion.div
            className="absolute inset-0 bg-emerald-500 rounded-full"
            animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            />
            </div>
            <span className="font-mono tracking-wider text-slate-500 uppercase">
            Synced
            </span>
            </div>
            <button className="hover:text-white transition-colors text-slate-500">
            <Settings size={14} />
            </button>
            </div>
            </motion.div>
        )}
        </AnimatePresence>

        {/* Main Editor Area */}
        <div className="flex-1 relative flex flex-col h-full z-10 overflow-hidden">
        {/* Top Bar - Sidebar Toggle */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-black/10 backdrop-blur-sm z-20">
        <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="text-slate-500 hover:text-white transition-colors group flex items-center gap-2"
        title={sidebarOpen ? "Collapse Archive" : "Expand Archive"}
        >
        <motion.div
        animate={{ rotate: sidebarOpen ? 0 : 180 }}
        transition={{ duration: 0.3 }}
        >
        <CornerDownLeft size={20} className={sidebarOpen ? "rotate-90" : "-rotate-90"} />
        </motion.div>
        <span className="text-xs font-mono uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
        {sidebarOpen ? 'Collapse' : 'Expand'}
        </span>
        </button>

        {noteId && (
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <span className="opacity-50">root</span>
            <ChevronRight size={12} />
            <span className="opacity-50">...</span>
            <ChevronRight size={12} />
            <span className="text-cyan-500">
            {notes?.find(n => n.id === parseInt(noteId))?.title || 'Loading...'}
            </span>
            </div>
        )}
        </div>

        {/* Content Area */}
        {noteId ? (
            <NoteDetailPage />
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center relative">
            <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
            >
            <div className="relative inline-block mb-6">
            <Database size={64} className="text-slate-800 opacity-20" />
            <motion.div
            className="absolute inset-0"
            animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 3, repeat: Infinity }}
            >
            <Sparkles size={64} className="text-cyan-500" />
            </motion.div>
            </div>
            <h3 className="text-xl font-serif font-bold text-slate-700 mb-2 tracking-wide">
            Neural Archive Standby
            </h3>
            <p className="text-sm font-mono text-slate-600 uppercase tracking-wider mb-6">
            Select fragment to initialize interface
            </p>
            <button
            onClick={handleCreateNote}
            className="px-6 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 text-xs font-mono uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.1)]"
            >
            <Plus className="inline mr-2 h-4 w-4" />
            Initialize New Fragment
            </button>
            </motion.div>
            </div>
        )}
        </div>
        </div>
    );
}

/**
 * Neural Item - Recursive Tree Node Component
 */
interface NeuralItemProps {
    item: NoteResponse & { children?: NoteResponse[] };
    level: number;
    selectedId: number | null;
    expandedIds: Set<number>;
    toggleExpand: (id: number) => void;
    onSelect: (id: number) => void;
    onDelete: (id: number, e: React.MouseEvent) => void;
}

const NeuralItem = ({
    item,
    level,
    selectedId,
    expandedIds,
    toggleExpand,
    onSelect,
    onDelete
}: NeuralItemProps) => {
    const isSelected = selectedId === item.id;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedIds.has(item.id);

    return (
        <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="relative"
        >
        {/* Connecting Line */}
        {level > 0 && (
            <div
            className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-500/20 via-cyan-500/10 to-transparent"
            style={{ left: `${(level * 20) - 10}px` }}
            />
        )}

        <button
        onClick={() => {
            if (hasChildren) toggleExpand(item.id);
            onSelect(item.id);
        }}
        className={cn(
            "w-full flex items-center gap-2 py-2 px-3 rounded-lg border-l-2 transition-all duration-200 group relative overflow-hidden",
            isSelected
            ? "bg-cyan-950/40 border-cyan-500 text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.1)]"
            : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5 hover:border-cyan-500/20"
        )}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
        >
        {/* Hover Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        {/* Expansion Arrow / Icon */}
        {hasChildren ? (
            <>
            <motion.span
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            >
            <ChevronRight size={12} />
            </motion.span>
            {isExpanded ? (
                <FolderOpen size={14} className="text-amber-400" />
            ) : (
                <Folder size={14} className="text-slate-500 group-hover:text-amber-300" />
            )}
            </>
        ) : (
            <>
            <div className="w-3" />
            <FileText size={14} className={cn(isSelected ? "text-cyan-400" : "text-slate-600")} />
            </>
        )}

        {/* Title */}
        <span className={cn(
            "flex-1 text-xs font-mono tracking-wide truncate text-left",
            isSelected ? "text-cyan-50 font-bold" : ""
        )}>
        {item.title || "Untitled"}
        </span>

        {/* Delete Action */}
        {!hasChildren && (
            <button
            onClick={(e) => onDelete(item.id, e)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-slate-600 hover:text-red-400 transition-all"
            title="Archive Fragment"
            >
            <Trash2 size={12} />
            </button>
        )}
        </button>

        {/* Children */}
        <AnimatePresence>
        {isExpanded && hasChildren && (
            <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
            >
            {item.children!.map((child) => (
                <NeuralItem
                key={child.id}
                item={child}
                level={level + 1}
                selectedId={selectedId}
                expandedIds={expandedIds}
                toggleExpand={toggleExpand}
                onSelect={onSelect}
                onDelete={onDelete}
                />
            ))}
            </motion.div>
        )}
        </AnimatePresence>
        </motion.div>
    );
};
