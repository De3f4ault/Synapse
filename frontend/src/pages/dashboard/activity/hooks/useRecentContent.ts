/**
 * useRecentContent - Hook for fetching recent documents and notes
 */

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { DocumentsService, NotesService } from "@/api/generated";
import type { DocumentResponse, NoteResponse } from "@/api/generated";

export interface RecentContentData {
    documents: DocumentResponse[];
    notes: NoteResponse[];
}

export function useRecentContent() {
    // Notes
    const notesQuery = useQuery({
        queryKey: queryKeys.notes.lists(),
        queryFn: () => NotesService.listNotesApiV1NotesGet(undefined, undefined, undefined, undefined, 1, 10),
        staleTime: 1000 * 60 * 5,
    });

    // Documents
    const documentsQuery = useQuery({
        queryKey: queryKeys.documents.lists(),
        queryFn: () => DocumentsService.listDocumentsApiV1DocumentsGet(),
        staleTime: 1000 * 60 * 5,
    });

    return {
        data: {
            documents: documentsQuery.data || [],
            notes: notesQuery.data || [],
        },
        isLoading: notesQuery.isLoading || documentsQuery.isLoading,
        error: notesQuery.error || documentsQuery.error,
        refetch: () => {
            notesQuery.refetch();
            documentsQuery.refetch();
        },
    };
}
