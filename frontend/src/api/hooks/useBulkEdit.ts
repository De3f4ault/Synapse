/**
 * useBulkEdit — TanStack Query hook for bulk document operations
 *
 * Wires BulkEditor.tsx to POST /api/v1/documents/bulk_edit
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DocumentsService } from "@/api/generated";
import type { BulkEditRequest, MessageResponse } from "@/api/generated";

/**
 * Perform a bulk edit operation on multiple documents.
 *
 * @example
 * const bulk = useBulkEdit();
 * bulk.mutate({ documents: [1,2,3], method: "set_correspondent", parameters: { correspondent: 5 } });
 */
export function useBulkEdit() {
  const qc = useQueryClient();

  return useMutation<MessageResponse, Error, BulkEditRequest>({
    mutationFn: (body) =>
      DocumentsService.bulkEditApiV1DocumentsBulkEditPost(body),
    onSuccess: () => {
      // Invalidate all document queries after bulk edit
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}
