import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { NotesService } from '@/api/generated';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Custom hook for managing notes CRUD operations
 */
export function useNotes() {
    const queryClient = useQueryClient();

    // Fetch all notes
    const {
        data: notes,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: queryKeys.notes.list(),
        queryFn: () => NotesService.listNotesApiV1NotesGet(),
    });

    // Create note mutation
    const createNoteMutation = useMutation({
        mutationFn: (data: { title: string; content?: string; tags?: string[] }) =>
            NotesService.createNoteApiV1NotesPost({
                title: data.title,
                content: data.content || '',
                tags: data.tags || null,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
            toast.success('NEURAL NODE INITIALIZED');
        },
        onError: (error) => {
            toast.error('INITIALIZATION FAILED', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
    });

    // Update note mutation
    const updateNoteMutation = useMutation({
        mutationFn: ({
            noteId,
            data,
        }: {
            noteId: number;
            data: { title: string; content: string; tags?: string[] };
        }) => NotesService.updateNoteApiV1NotesNoteIdPut(noteId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notes.detail(variables.noteId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.notes.list() });
            toast.success('ARTIFACT SYNCHRONIZED');
        },
        onError: (error) => {
            toast.error('SYNC FAILED', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
    });

    // Delete note mutation
    const deleteNoteMutation = useMutation({
        mutationFn: (noteId: number) => NotesService.deleteNoteApiV1NotesNoteIdDelete(noteId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
            toast.success('NODE ARCHIVED');
        },
        onError: (error) => {
            toast.error('ARCHIVE FAILED', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
    });

    return {
        notes,
        isLoading,
        error,
        refetch,
        createNote: createNoteMutation.mutateAsync, // Use mutateAsync for proper callbacks
        updateNote: updateNoteMutation.mutateAsync,
        deleteNote: deleteNoteMutation.mutateAsync,
        isCreating: createNoteMutation.isPending,
        isUpdating: updateNoteMutation.isPending,
        isDeleting: deleteNoteMutation.isPending,
    };
}

/**
 * Custom hook for fetching a single note
 */
export function useNote(noteId: number) {
    const { data: note, isLoading, error } = useQuery({
        queryKey: queryKeys.notes.detail(noteId),
        queryFn: () => NotesService.getNoteApiV1NotesNoteIdGet(noteId),
        enabled: !!noteId,
    });

    return {
        note,
        isLoading,
        error,
    };
}
