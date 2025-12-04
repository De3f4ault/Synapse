import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import { Network } from 'lucide-react';
import type { GraphData, GraphNode } from '../../types/graph.types';
import { GRAPH_CONFIG } from '../../constants/graphConfig';

interface GraphCanvasProps {
    data: GraphData;
    width: number;
    height: number;
    onNodeClick?: (node: GraphNode) => void;
    onNodeHover?: (node: GraphNode | null) => void;
    selectedNodeId?: string | null;
    hoveredNodeId?: string | null;
    connectedNodeIds?: Set<string>;
}

/**
 * GraphCanvas - Neural Nexus Engine (Production Cleaned)
 *
 * REMOVED:
 * - Bottom search/controls overlay (now in GraphControls)
 * - Duplicate stats display
 *
 * KEPT:
 * - Title overlay (only one)
 * - D3 force-directed graph
 * - Node interactions
 */
export function GraphCanvas({
    data,
    width,
    height,
    onNodeClick,
    onNodeHover,
    selectedNodeId,
    hoveredNodeId,
    connectedNodeIds = new Set(),
}: GraphCanvasProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });

    useEffect(() => {
        if (!svgRef.current || data.nodes.length === 0) return;

        const svg = d3.select(svgRef.current);
        const g = svg.select<SVGGElement>('g.graph-container');

        // Clear previous
        g.selectAll('*').remove();

        const linkGroup = g.append('g').attr('class', 'links');
        const nodeGroup = g.append('g').attr('class', 'nodes');

        const nodes = data.nodes.map(d => ({ ...d }));
        const links = data.links.map(d => ({ ...d }));

        // Force Simulation
        const simulation = d3.forceSimulation(nodes as any)
        .force('link', d3.forceLink(links as any).id((d: any) => d.id).distance(GRAPH_CONFIG.simulation.linkDistance))
        .force('charge', d3.forceManyBody().strength(GRAPH_CONFIG.simulation.charge))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius((d: any) => getNodeSize(d.type) + 10));

        // Draw Links
        const link = linkGroup.selectAll('line')
        .data(links)
        .join('line')
        .attr('class', 'graph-link');

        // Draw Nodes
        const node = nodeGroup.selectAll('g')
        .data(nodes)
        .join('g')
        .attr('class', (d: any) => `graph-node type-${mapNodeTypeToClass(d.type)}`)
        .call(d3.drag<SVGGElement, any>()
        .on('start', (e, d) => {
            if (!e.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => {
            if (!e.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
        }) as any
        );

        // Node Circles
        node.append('circle')
        .attr('class', (d: any) => `graph-node-circle type-${mapNodeTypeToClass(d.type)}`)
        .attr('r', (d: any) => getNodeSize(d.type));

        // Node Labels
        node.append('text')
        .attr('class', 'graph-node-label')
        .attr('dy', (d: any) => getNodeSize(d.type) + 12)
        .attr('text-anchor', 'middle')
        .text((d: any) => d.label)
        .style('display', (d: any) => ['document', 'flashcard'].includes(d.type) ? 'block' : 'none');

        // Interactions
        node.on('click', (e, d: any) => { e.stopPropagation(); onNodeClick?.(d); })
        .on('mouseenter', (e, d: any) => onNodeHover?.(d))
        .on('mouseleave', () => onNodeHover?.(null));

        // Tick
        simulation.on('tick', () => {
            link
            .attr('x1', (d: any) => d.source.x)
            .attr('y1', (d: any) => d.source.y)
            .attr('x2', (d: any) => d.target.x)
            .attr('y2', (d: any) => d.target.y);

            node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
        });

        return () => { simulation.stop(); };
    }, [data, width, height]);

    // Zoom setup
    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        const g = svg.select<SVGGElement>('g.graph-container');

        const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
            setTransform(event.transform);
        });

        svg.call(zoom as any);
        return () => { svg.on('.zoom', null); };
    }, []);

    const mapNodeTypeToClass = (type: string) => {
        switch (type) {
            case 'flashcard': return 'core';
            case 'document': return 'cluster';
            case 'note': return 'leaf';
            default: return 'leaf';
        }
    };

    const getNodeSize = (type: string) => {
        switch (type) {
            case 'flashcard': return 12;
            case 'document': return 8;
            default: return 5;
        }
    };

    if (data.nodes.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs font-mono">
            SYSTEM OFFLINE: NO NODES
            </div>
        );
    }

    return (
        <div className="knowledge-graph-container w-full h-full relative">
        <motion.svg
        ref={svgRef}
        width={width}
        height={height}
        className="knowledge-graph-svg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        >
        <g className="graph-container" />
        </motion.svg>

        {/* Title Overlay - SINGLE instance */}
        <div className="absolute top-6 left-6 pointer-events-none z-20">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
        <Network className="w-5 h-5 text-purple-500" /> Knowledge Graph
        </h2>
        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Neural Nexus Engine v2.0</p>
        </div>
        </div>
    );
}
