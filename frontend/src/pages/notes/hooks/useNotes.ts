import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    listNotesApiV1NotesGet,
    getNoteApiV1NotesNoteIdGet,
    createNoteApiV1NotesPost,
    updateNoteApiV1NotesNoteIdPut,
    deleteNoteApiV1NotesNoteIdDelete,
} from '@/api/generated/services.gen';
import { queryKeys } from '@/lib/queryKeys';
import type { NoteResponse } from '@/api/generated/types.gen';

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
                 queryFn: () => listNotesApiV1NotesGet(),
    });

    // Create note mutation
    const createNoteMutation = useMutation({
        mutationFn: createNoteApiV1NotesPost,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
            toast.success('NEURAL NODE INITIALIZED');
            return data;
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
        }) =>
        updateNoteApiV1NotesNoteIdPut({
            noteId,
            requestBody: data,
        }),
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
        mutationFn: (noteId: number) => deleteNoteApiV1NotesNoteIdDelete({ noteId }),
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
        createNote: createNoteMutation.mutate,
        updateNote: updateNoteMutation.mutate,
        deleteNote: deleteNoteMutation.mutate,
        isCreating: createNoteMutation.isPending,
        isUpdating: updateNoteMutation.isPending,
        isDeleting: deleteNoteMutation.isPending,
    };
}

/**
 * Custom hook for fetching a single note
 */
export function useNote(noteId: number) {
    const queryClient = useQueryClient();

    const { data: note, isLoading, error } = useQuery({
        queryKey: queryKeys.notes.detail(noteId),
                                                      queryFn: () => getNoteApiV1NotesNoteIdGet({ noteId }),
                                                      enabled: !!noteId,
    });

    return {
        note,
        isLoading,
        error,
    };
}
