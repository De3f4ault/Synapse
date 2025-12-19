import { useQuery } from '@tanstack/react-query';
import { LinksService } from '@/api/generated';
import { GraphNode, GraphEdge } from '../types';

interface UseKnowledgeGraphOptions {
    entityTypes?: string[];
    linkTypes?: string[];
    includeSuggested?: boolean;
    enabled?: boolean;
}

export const useKnowledgeGraph = ({
    entityTypes,
    linkTypes,
    includeSuggested = false,
    enabled = true
}: UseKnowledgeGraphOptions = {}) => {

    return useQuery({
        queryKey: ['knowledge-graph', { entityTypes, linkTypes, includeSuggested }],
        queryFn: async () => {
            const response = await LinksService.getKnowledgeGraphApiV1LinksGraphGet(
                entityTypes?.join(','),
                linkTypes?.join(','),
                includeSuggested
            );

            // Cast or map to our D3-compatible types
            // The API returns strings for source/target, which D3 will convert to objects
            // so we start with strings.
            return {
                nodes: response.nodes.map(n => ({ ...n })) as GraphNode[],
                edges: response.edges.map(e => ({ ...e })) as GraphEdge[],
                stats: response.stats
            };
        },
        enabled,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};
