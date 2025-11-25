import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getNoteApiV1NotesNoteIdGet } from '@/api/generated/services.gen';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Edit, Clock, Tag, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Enhanced Note Detail Page
 *
 * Features:
 * - Markdown rendering with GFM support
 * - Tag display
 * - Metadata sidebar
 * - Edit button
 * - Breadcrumb navigation
 */

export function NoteDetailPage() {
    const { noteId } = useParams<{ noteId: string }>();
    const navigate = useNavigate();
    const id = parseInt(noteId || '0', 10);

    const { data: note, isLoading } = useQuery({
        queryKey: queryKeys.notes.detail(id),
                                               queryFn: () => getNoteApiV1NotesNoteIdGet({ noteId: id }),
                                               enabled: !!id,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
        );
    }

    if (!note) {
        return (
            <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">Note not found</h2>
            <Button onClick={() => navigate('/notes')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Notes
            </Button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
        >
        <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/notes')}>
        <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
        <h1 className="text-3xl font-bold tracking-tight">{note.title}</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
        <div className="flex items-center gap-1">
        <Clock className="h-4 w-4" />
        <span>Updated {format(new Date(note.updated_at), 'MMM d, yyyy h:mm a')}</span>
        </div>
        {note.tags && note.tags.length > 0 && (
            <>
            <span>•</span>
            <div className="flex items-center gap-1">
            <Tag className="h-4 w-4" />
            <span>{note.tags.length} tags</span>
            </div>
            </>
        )}
        </div>
        </div>
        </div>

        <Button onClick={() => navigate(`/notes/${id}/edit`)}>
        <Edit className="mr-2 h-4 w-4" />
        Edit Note
        </Button>
        </motion.div>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
            <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-2"
            >
            {note.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                {tag}
                </Badge>
            ))}
            </motion.div>
        )}

        <Separator />

        {/* Content */}
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        >
        <Card>
        <CardContent className="prose prose-slate dark:prose-invert max-w-none p-8">
        {note.content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {note.content}
            </ReactMarkdown>
        ) : (
            <p className="text-muted-foreground italic">
            This note has no content yet. Click "Edit Note" to add content.
            </p>
        )}
        </CardContent>
        </Card>
        </motion.div>

        {/* Metadata Footer */}
        <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xs text-muted-foreground space-y-1"
        >
        <p>Created: {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}</p>
        <p>Last updated: {format(new Date(note.updated_at), 'MMM d, yyyy h:mm a')}</p>
        {note.parent_id && <p>Parent Note ID: {note.parent_id}</p>}
        </motion.div>
        </div>
    );
}
