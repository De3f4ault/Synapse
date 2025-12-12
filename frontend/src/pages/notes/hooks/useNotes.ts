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
 * 
 * NOTE: @hey-api/client-fetch returns { data, request, response }
 * We need to extract .data from each response
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
        queryFn: async () => {
            const response = await listNotesApiV1NotesGet();
            return (response as any).data ?? response;
        },
    });

    // Create note mutation
    const createNoteMutation = useMutation({
        mutationFn: async (data: { title: string; content?: string; tags?: string[] }) => {
            const response = await createNoteApiV1NotesPost({ body: data });
            return (response as any).data ?? response;
        },
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
        mutationFn: async ({
            noteId,
            data,
        }: {
            noteId: number;
            data: { title: string; content: string; tags?: string[] };
        }) => {
            const response = await updateNoteApiV1NotesNoteIdPut({
                path: { note_id: noteId },
                body: data,
            });
            return (response as any).data ?? response;
        },
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
        mutationFn: async (noteId: number) => {
            const response = await deleteNoteApiV1NotesNoteIdDelete({ path: { note_id: noteId } });
            return (response as any).data ?? response;
        },
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
        queryFn: async () => {
            const response = await getNoteApiV1NotesNoteIdGet({ path: { note_id: noteId } });
            return (response as any).data ?? response;
        },
        enabled: !!noteId,
    });

    return {
        note,
        isLoading,
        error,
    };
}

