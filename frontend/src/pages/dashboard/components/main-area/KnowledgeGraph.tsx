import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
 * KnowledgeGraph - "Neural Nexus" (Center Panel)
 * FIXED: Removed duplicate header - GraphCanvas already has title overlay
 */
export function KnowledgeGraph({ data }: KnowledgeGraphProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const graph = useKnowledgeGraph(data);

    useEffect(() => {
        if (!containerRef.current) return;
        const updateDimensions = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                setDimensions({ width, height });
            }
        };
        updateDimensions();
        const resizeObserver = new ResizeObserver(updateDimensions);
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    const connectedNodes = graph.selectedNode
    ? graph.graphData.nodes.filter(node => graph.connectedNodeIds.has(node.id) && node.id !== graph.selectedNode?.id)
    : [];

    return (
        <>
        <div className="h-full relative dashboard-glass rounded-2xl overflow-hidden border border-white/5 shadow-2xl group flex flex-col">
        {/* REMOVED: Duplicate header - GraphCanvas has its own title overlay */}

        <div ref={containerRef} className="flex-1 w-full h-full relative bg-[#050505]">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full">
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
        </div>

        {/* Controls (Bottom Overlay) */}
        <div className="absolute bottom-6 left-0 right-0 z-20 px-6 pointer-events-none flex justify-center">
        <div className="pointer-events-auto">
        <GraphControls
        filters={graph.filters}
        onToggleFilter={graph.toggleFilter}
        onSearchChange={graph.setSearchQuery}
        stats={graph.stats}
        />
        </div>
        </div>
        </div>

        <NodeDetailModal
        node={graph.selectedNode}
        connections={connectedNodes}
        onClose={graph.clearSelection}
        onNodeClick={graph.handleNodeClick}
        />
        </>
    );
}
