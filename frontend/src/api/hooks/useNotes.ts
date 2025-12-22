// Notes hooks using TanStack Query
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NotesService } from "../generated";
import type {
  NoteResponse,
  NoteCreate,
  NoteUpdate,
  NoteTreeNode,
  NoteSearchResult,
  NoteVersionResponse,
} from "../generated";

const NOTE_KEYS = {
  all: ["notes"] as const,
  lists: () => [...NOTE_KEYS.all, "list"] as const,
  list: (params?: unknown) => [...NOTE_KEYS.lists(), params] as const,
  detail: (id: number) => [...NOTE_KEYS.all, "detail", id] as const,
  tree: (rootId?: number | null) => [...NOTE_KEYS.all, "tree", rootId] as const,
  search: (query: string, limit?: number) =>
    [...NOTE_KEYS.all, "search", query, limit] as const,
  versions: (id: number) => [...NOTE_KEYS.all, "versions", id] as const,
};

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
    queryKey: NOTE_KEYS.list(params),
    queryFn: () =>
      NotesService.listNotesApiV1NotesGet(
        params?.parentId ?? undefined,
        params?.tags,
        params?.page,
        params?.pageSize,
      ),
  });
};

/**
 * Hook to get note hierarchy tree
 */
export const useNoteTree = (rootId?: number | null) => {
  return useQuery<NoteTreeNode[]>({
    queryKey: NOTE_KEYS.tree(rootId),
    queryFn: () =>
      NotesService.getNoteTreeApiV1NotesTreeGet(rootId ?? undefined),
  });
};

/**
 * Hook to search notes
 */
export const useSearchNotes = (query: string, limit?: number) => {
  return useQuery<NoteSearchResult[]>({
    queryKey: NOTE_KEYS.search(query, limit),
    queryFn: () => NotesService.searchNotesApiV1NotesSearchGet(query, limit),
    enabled: query.length > 0,
  });
};

/**
 * Hook to get a specific note
 */
export const useNote = (noteId: number) => {
  return useQuery<NoteResponse>({
    queryKey: NOTE_KEYS.detail(noteId),
    queryFn: () => NotesService.getNoteApiV1NotesNoteIdGet(noteId),
    enabled: !!noteId,
  });
};

/**
 * Hook to get note version history
 */
export const useNoteVersions = (noteId: number) => {
  return useQuery<NoteVersionResponse[]>({
    queryKey: NOTE_KEYS.versions(noteId),
    queryFn: () =>
      NotesService.getNoteVersionsApiV1NotesNoteIdVersionsGet(noteId),
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
      NotesService.createNoteApiV1NotesPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTE_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: NOTE_KEYS.all });
    },
  });
};

/**
 * Hook to update a note
 */
export const useUpdateNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, data }: { noteId: number; data: NoteUpdate }) =>
      NotesService.updateNoteApiV1NotesNoteIdPut(noteId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: NOTE_KEYS.detail(variables.noteId),
      });
      queryClient.invalidateQueries({
        queryKey: NOTE_KEYS.versions(variables.noteId),
      });
      queryClient.invalidateQueries({ queryKey: NOTE_KEYS.lists() });
    },
  });
};

/**
 * Hook to delete a note
 */
export const useDeleteNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: number) =>
      NotesService.deleteNoteApiV1NotesNoteIdDelete(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTE_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: NOTE_KEYS.all });
    },
  });
};
