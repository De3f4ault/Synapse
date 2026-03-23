/**
 * useDocumentNotes — TanStack Query hooks for document notes
 *
 * Wires DocumentNotes.tsx to:
 *   GET    /api/v1/documents/{id}/notes
 *   POST   /api/v1/documents/{id}/notes
 *   DELETE /api/v1/documents/{id}/notes/{noteId}
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DocumentsService } from "@/api/generated";
import type {
  DocumentNoteResponse,
  DocumentNoteCreate,
} from "@/api/generated";

export const NOTE_KEYS = {
  all: ["documentNotes"] as const,
  list: (docId: number) => [...NOTE_KEYS.all, docId] as const,
};

/** Fetch all notes for a document */
export function useDocumentNotes(documentId: number) {
  return useQuery<DocumentNoteResponse[]>({
    queryKey: NOTE_KEYS.list(documentId),
    queryFn: () =>
      DocumentsService.listDocumentNotesApiV1DocumentsDocumentIdNotesGet(
        documentId,
      ),
    enabled: !!documentId,
    staleTime: 30_000,
  });
}

/** Add a note to a document */
export function useAddDocumentNote(documentId: number) {
  const qc = useQueryClient();
  return useMutation<DocumentNoteResponse, Error, string>({
    mutationFn: (note) =>
      DocumentsService.createDocumentNoteApiV1DocumentsDocumentIdNotesPost(
        documentId,
        { note } as DocumentNoteCreate,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTE_KEYS.list(documentId) });
    },
  });
}

/** Delete a note from a document */
export function useDeleteDocumentNote(documentId: number) {
  const qc = useQueryClient();
  return useMutation<unknown, Error, number>({
    mutationFn: (noteId) =>
      DocumentsService.deleteDocumentNoteApiV1DocumentsDocumentIdNotesNoteIdDelete(
        documentId,
        noteId,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTE_KEYS.list(documentId) });
    },
  });
}
