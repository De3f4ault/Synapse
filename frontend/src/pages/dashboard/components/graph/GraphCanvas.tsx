import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import type { GraphData, GraphNode, GraphLink } from '../../types/graph.types';
import { GRAPH_CONFIG } from '../../constants/graphConfig';
import { GraphNode as GraphNodeComponent } from './GraphNode';

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
 * GraphCanvas - D3.js force-directed graph visualization
 *
 * Features:
 * - Force simulation with customizable forces
 * - Zoom and pan support
 * - Node collision detection
 * - Link strength based on connection type
 * - Highlighted connections on hover/select
 * - SVG rendering with crisp edges
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

        // Clear previous content
        g.selectAll('*').remove();

        // Create link and node groups
        const linkGroup = g.append('g').attr('class', 'links');
        const nodeGroup = g.append('g').attr('class', 'nodes');

        // Copy data to avoid mutation
        const nodes = data.nodes.map(d => ({ ...d }));
        const links = data.links.map(d => ({ ...d }));

        // Create force simulation
        const simulation = d3.forceSimulation(nodes as any)
        .force('link', d3.forceLink(links as any)
        .id((d: any) => d.id)
        .distance(GRAPH_CONFIG.simulation.linkDistance)
        .strength((d: any) => d.strength || 0.5)
        )
        .force('charge', d3.forceManyBody()
        .strength(GRAPH_CONFIG.simulation.charge)
        )
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide()
        .radius((d: any) => (d.size || 10) + GRAPH_CONFIG.simulation.collisionRadius)
        );

        // Draw links
        const link = linkGroup
        .selectAll<SVGLineElement, any>('line')
        .data(links)
        .join('line')
        .attr('class', 'graph-link')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.3)
        .attr('stroke-width', (d: any) => {
            switch (d.type) {
                case 'hierarchy':
                    return 3;
                case 'derived_from':
                    return 2;
                case 'generated_from':
                    return 2;
                default:
                    return 1;
            }
        })
        .attr('stroke-dasharray', (d: any) => {
            return d.type === 'same_deck' ? '5,5' : '0';
        });

        // Draw nodes
        const node = nodeGroup
        .selectAll<SVGCircleElement, GraphNode>('circle')
        .data(nodes)
        .join('circle')
        .attr('class', 'graph-node')
        .attr('r', (d: any) => d.size || 10)
        .attr('fill', (d: any) => d.color || '#6366f1')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
            event.stopPropagation();
            onNodeClick?.(d);
        })
        .on('mouseenter', (event, d) => {
            onNodeHover?.(d);
        })
        .on('mouseleave', () => {
            onNodeHover?.(null);
        });

        // Add drag behavior
        const drag = d3.drag<SVGCircleElement, GraphNode>()
        .on('start', (event, d: any) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        })
        .on('drag', (event, d: any) => {
            d.fx = event.x;
            d.fy = event.y;
        })
        .on('end', (event, d: any) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        });

        node.call(drag as any);

        // Add labels
        const labels = nodeGroup
        .selectAll<SVGTextElement, GraphNode>('text')
        .data(nodes)
        .join('text')
        .attr('class', 'graph-label')
        .attr('text-anchor', 'middle')
        .attr('dy', (d: any) => (d.size || 10) + 12)
        .attr('font-size', '10px')
        .attr('fill', 'currentColor')
        .attr('pointer-events', 'none')
        .text((d: any) => d.label.length > 15 ? d.label.slice(0, 15) + '...' : d.label);

        // Update positions on tick
        simulation.on('tick', () => {
            link
            .attr('x1', (d: any) => d.source.x)
            .attr('y1', (d: any) => d.source.y)
            .attr('x2', (d: any) => d.target.x)
            .attr('y2', (d: any) => d.target.y);

            node
            .attr('cx', (d: any) => d.x)
            .attr('cy', (d: any) => d.y);

            labels
            .attr('x', (d: any) => d.x)
            .attr('y', (d: any) => d.y);
        });

        // Cleanup
        return () => {
            simulation.stop();
        };
    }, [data, width, height, onNodeClick, onNodeHover]);

    // Update highlights on selection/hover
    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        const nodes = svg.selectAll<SVGCircleElement, GraphNode>('.graph-node');
        const links = svg.selectAll<SVGLineElement, any>('.graph-link');

        // Reset all nodes and links
        nodes
        .attr('opacity', 1)
        .attr('stroke-width', 2);

        links
        .attr('stroke-opacity', 0.3);

        // Highlight connected nodes and links
        if (connectedNodeIds.size > 0) {
            nodes
            .attr('opacity', (d: any) => connectedNodeIds.has(d.id) ? 1 : 0.2)
            .attr('stroke-width', (d: any) =>
            d.id === selectedNodeId || d.id === hoveredNodeId ? 4 : 2
            );

            links
            .attr('stroke-opacity', (d: any) => {
                const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
                const targetId = typeof d.target === 'string' ? d.target : d.target.id;
                return (connectedNodeIds.has(sourceId) && connectedNodeIds.has(targetId)) ? 0.8 : 0.1;
            });
        }
    }, [selectedNodeId, hoveredNodeId, connectedNodeIds]);

    // Setup zoom
    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        const g = svg.select<SVGGElement>('g.graph-container');

        const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([GRAPH_CONFIG.viewport.minZoom, GRAPH_CONFIG.viewport.maxZoom])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
            setTransform({
                k: event.transform.k,
                x: event.transform.x,
                y: event.transform.y,
            });
        });

        svg.call(zoom as any);

        // Initial zoom
        svg.call(
            zoom.transform as any,
            d3.zoomIdentity
            .translate(transform.x, transform.y)
            .scale(transform.k)
        );

        return () => {
            svg.on('.zoom', null);
        };
    }, []);

    if (data.nodes.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">No nodes to display</p>
            </div>
        );
    }

    return (
        <motion.svg
        ref={svgRef}
        width={width}
        height={height}
        className="graph-canvas"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
            background: 'transparent',
            userSelect: 'none'
        }}
        >
        <defs>
        {/* Gradient for links */}
        <linearGradient id="link-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#999" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#999" stopOpacity="0.1" />
        </linearGradient>
        </defs>
        <g className="graph-container" />
        </motion.svg>
    );
}
