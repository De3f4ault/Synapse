// Notes hooks using TanStack Query
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    listNotesApiV1NotesGet,
    createNoteApiV1NotesPost,
    getNoteTreeApiV1NotesTreeGet,
    searchNotesApiV1NotesSearchGet,
    getNoteApiV1NotesNoteIdGet,
    updateNoteApiV1NotesNoteIdPut,
    deleteNoteApiV1NotesNoteIdDelete,
    getNoteVersionsApiV1NotesNoteIdVersionsGet,
} from '../generated';
import type {
    NoteResponse,
    NoteCreate,
    NoteUpdate,
    NoteTreeNode,
    NoteSearchResult,
    NoteVersionResponse,
} from '../generated';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Hook to list notes with pagination and filtering
 */
export const useNotes = (params?: {
    parentId?: number | null;
    tags?: string;
    page?: number;
    pageSize?: number;
}) => {
    return useQuery<NoteResponse[]>({
        queryKey: queryKeys.notes.list(params),
                                    queryFn: () => listNotesApiV1NotesGet(params || {}),
    });
};

/**
 * Hook to get note hierarchy tree
 */
export const useNoteTree = (rootId?: number | null) => {
    return useQuery<NoteTreeNode[]>({
        queryKey: queryKeys.notes.tree(rootId),
                                    queryFn: () => getNoteTreeApiV1NotesTreeGet({ rootId: rootId ?? null }),
    });
};

/**
 * Hook to search notes
 */
export const useSearchNotes = (query: string, limit?: number) => {
    return useQuery<NoteSearchResult[]>({
        queryKey: queryKeys.notes.search(query, limit),
                                        queryFn: () => searchNotesApiV1NotesSearchGet({ query, limit }),
                                        enabled: query.length > 0,
    });
};

/**
 * Hook to get a specific note
 */
export const useNote = (noteId: number) => {
    return useQuery<NoteResponse>({
        queryKey: queryKeys.notes.detail(noteId),
                                  queryFn: () => getNoteApiV1NotesNoteIdGet({ noteId }),
                                  enabled: !!noteId,
    });
};

/**
 * Hook to get note version history
 */
export const useNoteVersions = (noteId: number) => {
    return useQuery<NoteVersionResponse[]>({
        queryKey: queryKeys.notes.versions(noteId),
                                           queryFn: () => getNoteVersionsApiV1NotesNoteIdVersionsGet({ noteId }),
                                           enabled: !!noteId,
    });
};

/**
 * Hook to create a new note
 */
export const useCreateNote = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: NoteCreate) =>
        createNoteApiV1NotesPost({ requestBody: data }),
                       onSuccess: () => {
                           queryClient.invalidateQueries({ queryKey: queryKeys.notes.lists() });
                           queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
                       },
    });
};

/**
 * Hook to update a note (creates new version)
 */
export const useUpdateNote = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ noteId, data }: { noteId: number; data: NoteUpdate }) =>
        updateNoteApiV1NotesNoteIdPut({ noteId, requestBody: data }),
                       onSuccess: (_, variables) => {
                           queryClient.invalidateQueries({
                               queryKey: queryKeys.notes.detail(variables.noteId)
                           });
                           queryClient.invalidateQueries({
                               queryKey: queryKeys.notes.versions(variables.noteId),
                           });
                           queryClient.invalidateQueries({ queryKey: queryKeys.notes.lists() });
                       },
    });
};

/**
 * Hook to delete a note (soft delete, includes children)
 */
export const useDeleteNote = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (noteId: number) =>
        deleteNoteApiV1NotesNoteIdDelete({ noteId }),
                       onSuccess: () => {
                           queryClient.invalidateQueries({ queryKey: queryKeys.notes.lists() });
                           queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
                       },
    });
};
