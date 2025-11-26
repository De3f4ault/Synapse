import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Network, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DashboardData } from '../../types/dashboard.types';
import { useKnowledgeGraph } from '../../hooks/useKnowledgeGraph';
import { GraphCanvas } from '../graph/GraphCanvas';
import { GraphControls } from '../graph/GraphControls';
import { NodeDetailModal } from '../graph/NodeDetailModal';

interface KnowledgeGraphProps {
    data: DashboardData | undefined;
}

/**
 * KnowledgeGraph - Center panel with interactive graph visualization
 *
 * Features:
 * - D3 force-directed graph
 * - Zoom and pan controls
 * - Filter by module type
 * - Search nodes
 * - Click to view details
 * - Responsive sizing
 */
export function KnowledgeGraph({ data }: KnowledgeGraphProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [isFullscreen, setIsFullscreen] = useState(false);

    const graph = useKnowledgeGraph(data);

    // Update dimensions on resize
    useEffect(() => {
        if (!containerRef.current) return;

        const updateDimensions = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                setDimensions({
                    width: width - 32, // Account for padding
                    height: height - 120 // Account for header and controls
                });
            }
        };

        updateDimensions();

        const resizeObserver = new ResizeObserver(updateDimensions);
        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, []);

    // Get connected nodes for detail modal
    const connectedNodes = graph.selectedNode
    ? graph.graphData.nodes.filter(node =>
    graph.connectedNodeIds.has(node.id) && node.id !== graph.selectedNode?.id
    )
    : [];

    if (graph.isLoading) {
        return (
            <Card className="h-full">
            <CardHeader>
            <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Knowledge Graph</h2>
            </div>
            </div>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
            <Network className="h-8 w-8 mx-auto text-muted-foreground animate-pulse" />
            <p className="text-sm text-muted-foreground">
            Building your knowledge graph...
            </p>
            </div>
            </CardContent>
            </Card>
        );
    }

    if (graph.isEmpty) {
        return (
            <Card className="h-full">
            <CardHeader>
            <div className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Knowledge Graph</h2>
            </div>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3 max-w-md">
            <Network className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="font-semibold">No Content Yet</h3>
            <p className="text-sm text-muted-foreground">
            Start creating documents, notes, and flashcards to see your knowledge graph grow.
            </p>
            </div>
            </CardContent>
            </Card>
        );
    }

    return (
        <>
        <Card className="h-full flex flex-col">
        <CardHeader className="flex-none">
        <div className="space-y-3">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
        <Network className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Knowledge Graph</h2>
        </div>
        <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsFullscreen(!isFullscreen)}
        >
        <Maximize2 className="h-4 w-4" />
        </Button>
        </div>

        <GraphControls
        filters={graph.filters}
        onToggleFilter={graph.toggleFilter}
        onSearchChange={graph.setSearchQuery}
        stats={graph.stats}
        />
        </div>
        </CardHeader>

        <CardContent
        ref={containerRef}
        className="flex-1 p-4 relative overflow-hidden"
        >
        <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full h-full"
        >
        <GraphCanvas
        data={graph.graphData}
        width={dimensions.width}
        height={dimensions.height}
        onNodeClick={graph.handleNodeClick}
        onNodeHover={graph.handleNodeHover}
        selectedNodeId={graph.selectedNode?.id}
        hoveredNodeId={graph.hoveredNode?.id}
        connectedNodeIds={graph.connectedNodeIds}
        />
        </motion.div>

        {/* Overlay hint for empty graph after filters */}
        {graph.graphData.nodes.length === 0 && !graph.isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
            No nodes match your current filters
            </p>
            <Button
            variant="outline"
            size="sm"
            onClick={graph.resetFilters}
            >
            Reset Filters
            </Button>
            </div>
            </div>
        )}
        </CardContent>
        </Card>

        {/* Node Detail Modal */}
        <NodeDetailModal
        node={graph.selectedNode}
        connections={connectedNodes}
        onClose={graph.clearSelection}
        onNodeClick={graph.handleNodeClick}
        />
        </>
    );
}
