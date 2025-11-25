import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { listNotesApiV1NotesGet } from '@/api/generated/services.gen';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
    Plus,
    Search,
    FileText,
    ChevronRight,
    ChevronDown,
    Folder,
    Clock,
    Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/common/EmptyState';
import type { NoteResponse } from '@/api/generated/types.gen';
import { format } from 'date-fns';

/**
 * Enhanced Notes Page - Three-Column Layout
 *
 * Features:
 * - Left: Note tree (hierarchical navigation)
 * - Center: Note list (filtered by tree selection)
 * - Right: Note preview
 * - Real-time search
 * - Tag filtering
 */

export function NotesPage() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNote, setSelectedNote] = useState<NoteResponse | null>(null);
    const [selectedParent, setSelectedParent] = useState<number | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());

    // Fetch all notes
    const { data: notes, isLoading } = useQuery({
        queryKey: queryKeys.notes.list(),
                                                queryFn: () => listNotesApiV1NotesGet(),
    });

    // Filter notes
    const filteredNotes = notes?.filter((note: NoteResponse) => {
        const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesParent = selectedParent === null || note.parent_id === selectedParent;
        return matchesSearch && matchesParent;
    });

    // Build tree structure
    const rootNotes = notes?.filter((note: NoteResponse) => !note.parent_id) || [];
    const getNoteChildren = (parentId: number) =>
    notes?.filter((note: NoteResponse) => note.parent_id === parentId) || [];

    const toggleFolder = (id: number) => {
        setExpandedFolders((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
        {/* Header */}
        <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
        >
        <div>
        <h1 className="text-3xl font-bold tracking-tight">Notes</h1>
        <p className="text-muted-foreground mt-1">
        Organize your knowledge and thoughts
        </p>
        </div>
        <Button onClick={() => navigate('/notes/new')} size="lg">
        <Plus className="mr-2 h-4 w-4" />
        New Note
        </Button>
        </motion.div>

        {/* Search Bar */}
        <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative"
        >
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
        placeholder="Search notes..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-10"
        />
        </motion.div>

        {/* Three-Column Layout */}
        <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden">
        {/* Left: Note Tree */}
        <Card className="col-span-3 overflow-hidden flex flex-col">
        <CardHeader className="pb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
        <Folder className="h-4 w-4" />
        Folders
        </h3>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
        <Button
        variant={selectedParent === null ? 'secondary' : 'ghost'}
        className="w-full justify-start mb-1"
        onClick={() => setSelectedParent(null)}
        >
        <FileText className="mr-2 h-4 w-4" />
        All Notes
        </Button>

        {rootNotes.map((note: NoteResponse) => (
            <NoteTreeItem
            key={note.id}
            note={note}
            getNoteChildren={getNoteChildren}
            selectedParent={selectedParent}
            setSelectedParent={setSelectedParent}
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
            level={0}
            />
        ))}
        </ScrollArea>
        </CardContent>
        </Card>

        {/* Center: Note List */}
        <Card className="col-span-4 overflow-hidden flex flex-col">
        <CardHeader className="pb-3">
        <h3 className="font-semibold text-sm">
        Notes ({filteredNotes?.length || 0})
        </h3>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
        {isLoading ? (
            <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
            </div>
        ) : !filteredNotes || filteredNotes.length === 0 ? (
            <div className="p-4">
            <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title={searchQuery ? 'No notes found' : 'No notes yet'}
            description={
                searchQuery
                ? 'Try adjusting your search'
                : 'Create your first note to get started'
            }
            action={
                searchQuery
                ? undefined
                : {
                    label: 'New Note',
                    onClick: () => navigate('/notes/new'),
                }
            }
            variant="no-data"
            />
            </div>
        ) : (
            <div className="space-y-2 p-2">
            {filteredNotes.map((note: NoteResponse) => (
                <motion.div
                key={note.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ x: 4 }}
                >
                <div
                className={cn(
                    'p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent',
                    selectedNote?.id === note.id && 'bg-accent border-primary'
                )}
                onClick={() => setSelectedNote(note)}
                >
                <h4 className="font-medium line-clamp-1 mb-1">{note.title}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {note.content || 'No content'}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{format(new Date(note.updated_at), 'MMM d, yyyy')}</span>
                </div>
                </div>
                </motion.div>
            ))}
            </div>
        )}
        </ScrollArea>
        </CardContent>
        </Card>

        {/* Right: Note Preview */}
        <Card className="col-span-5 overflow-hidden flex flex-col">
        <CardHeader className="pb-3">
        <h3 className="font-semibold text-sm">Preview</h3>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
        {selectedNote ? (
            <motion.div
            key={selectedNote.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
            >
            <div>
            <h2 className="text-2xl font-bold mb-2">{selectedNote.title}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
            Updated {format(new Date(selectedNote.updated_at), 'MMM d, yyyy h:mm a')}
            </span>
            </div>
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none">
            {selectedNote.content || (
                <p className="text-muted-foreground italic">No content yet...</p>
            )}
            </div>

            <div className="flex gap-2 pt-4 border-t">
            <Button
            onClick={() => navigate(`/notes/${selectedNote.id}`)}
            className="flex-1"
            >
            Open Note
            </Button>
            <Button
            variant="outline"
            onClick={() => navigate(`/notes/${selectedNote.id}/edit`)}
            >
            Edit
            </Button>
            </div>
            </motion.div>
        ) : (
            <div className="flex items-center justify-center h-full">
            <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="No note selected"
            description="Select a note from the list to preview"
            variant="no-data"
            />
            </div>
        )}
        </ScrollArea>
        </CardContent>
        </Card>
        </div>
        </div>
    );
}

/**
 * Note Tree Item (Recursive)
 */
interface NoteTreeItemProps {
    note: NoteResponse;
    getNoteChildren: (parentId: number) => NoteResponse[];
    selectedParent: number | null;
    setSelectedParent: (id: number | null) => void;
    expandedFolders: Set<number>;
    toggleFolder: (id: number) => void;
    level: number;
}

function NoteTreeItem({
    note,
    getNoteChildren,
    selectedParent,
    setSelectedParent,
    expandedFolders,
    toggleFolder,
    level,
}: NoteTreeItemProps) {
    const children = getNoteChildren(note.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedFolders.has(note.id);
    const isSelected = selectedParent === note.id;

    return (
        <div className="select-none">
        <Button
        variant={isSelected ? 'secondary' : 'ghost'}
        className={cn(
            'w-full justify-start text-sm mb-1',
            'hover:bg-accent'
        )}
        style={{ paddingLeft: `${level * 12 + 12}px` }}
        onClick={() => {
            if (hasChildren) {
                toggleFolder(note.id);
            }
            setSelectedParent(note.id);
        }}
        >
        {hasChildren && (
            <span className="mr-1">
            {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
            ) : (
                <ChevronRight className="h-3 w-3" />
            )}
            </span>
        )}
        {hasChildren ? (
            <Folder className="mr-2 h-4 w-4" />
        ) : (
            <FileText className="mr-2 h-4 w-4" />
        )}
        <span className="truncate">{note.title}</span>
        </Button>

        {hasChildren && isExpanded && (
            <div>
            {children.map((child) => (
                <NoteTreeItem
                key={child.id}
                note={child}
                getNoteChildren={getNoteChildren}
                selectedParent={selectedParent}
                setSelectedParent={setSelectedParent}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                level={level + 1}
                />
            ))}
            </div>
        )}
        </div>
    );
}
