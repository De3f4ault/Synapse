/**
 * useDocumentMetadata — TanStack Query hook for document technical metadata
 *
 * Wires to GET /api/v1/documents/{id}/metadata
 */

import { useQuery } from "@tanstack/react-query";
import { DocumentsService } from "@/api/generated";
import type { DocumentMetadataResponse } from "@/api/generated";

export function useDocumentMetadata(documentId: number) {
  return useQuery<DocumentMetadataResponse>({
    queryKey: ["documents", "metadata", documentId],
    queryFn: () =>
      DocumentsService.getDocumentMetadataApiV1DocumentsDocumentIdMetadataGet(
        documentId,
      ),
    enabled: !!documentId,
    staleTime: 120_000,
  });
}
