import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";

interface ThumbnailData {
    data: string; // base64 data URL
    filename: string;
}

interface BatchThumbnailsResponse {
    thumbnails: Record<string, ThumbnailData | null>;
}

/**
 * Batch fetch thumbnails for multiple documents.
 * 
 * Performance: 1 request instead of N requests for N documents.
 * Returns a map of document ID -> base64 thumbnail data URL.
 */
export function useThumbnails(documentIds: number[]) {
    const token = useAuthStore((state) => state.token);

    return useQuery({
        queryKey: ["thumbnails", documentIds.sort().join(",")],
        queryFn: async (): Promise<Record<string, string | null>> => {
            if (!documentIds.length) return {};

            const response = await fetch(
                `/api/v1/documents/batch/thumbs?ids=${documentIds.join(",")}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to fetch thumbnails");
            }

            const data: BatchThumbnailsResponse = await response.json();

            // Transform to simple id -> dataUrl map
            const result: Record<string, string | null> = {};
            for (const [id, thumb] of Object.entries(data.thumbnails)) {
                result[id] = thumb?.data ?? null;
            }
            return result;
        },
        enabled: documentIds.length > 0 && !!token,
        staleTime: 1000 * 60 * 10, // 10 minutes - thumbnails rarely change
        gcTime: 1000 * 60 * 30, // 30 minutes cache
    });
}
