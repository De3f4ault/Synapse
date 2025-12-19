import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useKnowledgeGraph } from './hooks/useKnowledgeGraph';
import { KnowledgeGraph } from './components/KnowledgeGraph';
import { KnowledgeSidebar } from './components/KnowledgeSidebar';
import { NodeDetailsPanel } from './components/NodeDetailsPanel';
import { GraphNode, ENTITY_CONFIG } from './types';
import { LoadingScreen } from '@/components/layout/LoadingScreen';

export const KnowledgeGraphPage: React.FC = () => {
    // State
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilters, setActiveFilters] = useState<string[]>(Object.keys(ENTITY_CONFIG));
    const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);

    // Data Fetching
    const { data, isLoading, refetch } = useKnowledgeGraph({
        // We fetch all and filter client-side for smoother UX for now
        // But we could pass filters to API if dataset is huge
    });

    // Handle Resize
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                setContainerDimensions({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Filter Data
    const { nodes, edges } = useMemo(() => {
        if (!data) return { nodes: [], edges: [] };

        // 1. Filter by Entity Type
        const validNodes = data.nodes.filter(n => activeFilters.includes(n.type as string));
        const validNodeIds = new Set(validNodes.map(n => n.id));

        // 2. Filter Edges (both source and target must exist)
        const validEdges = data.edges.filter(e => {
            // D3 mutates source/target to objects, but initially they are strings
            // We need to handle both cases safely
            // However, since we recreate the array on every render from `data`, 
            // `data.edges` might still have strings if we didn't mutate IT directly.
            // But `useKnowledgeGraph` returns new objects.
            // Let's assume strings for the filter check first.
            const sourceId = typeof e.source === 'object' ? (e.source as GraphNode).id : e.source;
            const targetId = typeof e.target === 'object' ? (e.target as GraphNode).id : e.target;
            return validNodeIds.has(sourceId as string) && validNodeIds.has(targetId as string);
        });

        // 3. Search Filter (if query exists, maybe just highlight? Or filter exclusive?)
        // Let's just use Search to highlight for now, not filter out.
        // It's handled by `highlightedNodeId`.

        return { nodes: validNodes, edges: validEdges };
    }, [data, activeFilters]);

    // Derived State for Search
    const highlightedNodeId = useMemo(() => {
        if (!searchQuery.trim() || !data) return null;
        const query = searchQuery.toLowerCase();
        // Simple name match
        const found = data.nodes.find((n: GraphNode) =>
            (n.label?.toLowerCase().includes(query)) ||
            ((n.type as string).includes(query)) ||
            (String(n.entity_id).includes(query))
        );
        return found ? found.id : null;
    }, [searchQuery, data]);


    // Handlers
    const handleToggleFilter = (type: string) => {
        setActiveFilters(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#0f172a] relative">
            {/* Sidebar */}
            <KnowledgeSidebar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activeFilters={activeFilters}
                onToggleFilter={handleToggleFilter}
                onRefresh={refetch}
                stats={data?.stats}
                className="z-10 relative"
            />

            {/* Main Graph Area */}
            <div ref={containerRef} className="flex-1 relative h-full">
                {containerDimensions.width > 0 && (
                    <KnowledgeGraph
                        nodes={nodes}
                        edges={edges}
                        width={containerDimensions.width}
                        height={containerDimensions.height}
                        onNodeClick={setSelectedNode}
                        onBackgroundClick={() => setSelectedNode(null)}
                        highlightedNodeId={highlightedNodeId}
                    />
                )}
            </div>

            {/* Details Panel */}
            {selectedNode && (
                <NodeDetailsPanel
                    node={selectedNode}
                    onClose={() => setSelectedNode(null)}
                    className="z-20"
                />
            )}
        </div>
    );
};

// Also export default for lazy loading
export default KnowledgeGraphPage;

