/**
 * useDocumentStatistics — TanStack Query hook for DMS dashboard stats
 *
 * Wires DMSStatsWidget.tsx to GET /api/v1/documents/statistics
 */

import { useQuery } from "@tanstack/react-query";
import { DocumentsService } from "@/api/generated";

export interface DocumentStatistics {
  documents_total: number;
  documents_inbox: number;
  inbox_tag: number | null;
  characters_total: number;
  correspondents_total: number;
  tags_total: number;
  document_types_total: number;
  storage_total_bytes: number;
  documents_this_month: number;
  documents_last_month: number;
}

export function useDocumentStatistics() {
  return useQuery<DocumentStatistics>({
    queryKey: ["documents", "statistics"],
    queryFn: () =>
      DocumentsService.getStatisticsApiV1DocumentsStatisticsGet(),
    staleTime: 60_000,
  });
}
