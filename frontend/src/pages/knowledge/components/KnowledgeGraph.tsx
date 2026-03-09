import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { GraphNode, GraphEdge, ENTITY_CONFIG, LINK_COLORS } from "../types";

interface KnowledgeGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width?: number;
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
  onBackgroundClick?: () => void;
  highlightedNodeId?: string | null;
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  nodes,
  edges,
  width = 800,
  height = 600,
  onNodeClick,
  onBackgroundClick,
  highlightedNodeId,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(
    null,
  );
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Initial setup
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    // Clear previous content
    svg.selectAll("*").remove();

    // Create main group for zoom/pan
    const g = svg.append("g").attr("class", "main-group");

    // Define arrow markers
    const defs = svg.append("defs");

    // Standard arrow
    defs
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 24)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#64748b");

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Initialize simulation
    simulationRef.current = d3
      .forceSimulation<GraphNode, GraphEdge>()
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphEdge>()
          .id((d) => d.id)
          .distance(150),
      )
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(50).strength(0.7));

    // Cleanup
    return () => {
      simulationRef.current?.stop();
    };
  }, []); // Only run once on mount

  // Update simulation when data changes
  useEffect(() => {
    if (!svgRef.current || !simulationRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = svg.select<SVGGElement>(".main-group");
    const simulation = simulationRef.current;

    simulation.nodes(nodes);
    (simulation.force("link") as d3.ForceLink<GraphNode, GraphEdge>).links(
      edges,
    );

    // Render Links
    const link = g
      .selectAll<SVGLineElement, GraphEdge>(".link")
      .data(edges, (d) => String(d.id))
      .join("line")
      .attr("class", "link")
      .attr("stroke", (d) => LINK_COLORS[d.type] || "#64748b")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d) => Math.max(1, d.strength * 3))
      .attr("marker-end", "url(#arrow)")
      .style("cursor", "pointer");

    // Edge tooltips
    link.selectAll("title").remove();
    link.append("title").text((d) => {
      const sourceLabel =
        typeof d.source === "object"
          ? (d.source as GraphNode).label || (d.source as GraphNode).id
          : d.source;
      const targetLabel =
        typeof d.target === "object"
          ? (d.target as GraphNode).label || (d.target as GraphNode).id
          : d.target;
      return `${sourceLabel} → ${targetLabel}\n${d.type} · ${Math.round(d.strength * 100)}%`;
    });

    // Edge hover: highlight connected nodes
    link
      .on("mouseenter", function (_event, d) {
        // Dim all nodes and links
        g.selectAll<SVGGElement, GraphNode>(".node").style("opacity", 0.2);
        g.selectAll<SVGLineElement, GraphEdge>(".link").style("opacity", 0.1);

        // Highlight this edge
        d3.select(this).style("opacity", 1).attr("stroke-width", function(this: SVGLineElement) {
          const d = d3.select<SVGLineElement, GraphEdge>(this).datum();
          return Math.max(2, d.strength * 4);
        });

        // Highlight connected nodes
        const sourceId =
          typeof d.source === "object"
            ? (d.source as GraphNode).id
            : d.source;
        const targetId =
          typeof d.target === "object"
            ? (d.target as GraphNode).id
            : d.target;

        g.selectAll<SVGGElement, GraphNode>(".node")
          .filter(
            (n) =>
              n.id === sourceId || n.id === targetId,
          )
          .style("opacity", 1);
      })
      .on("mouseleave", function () {
        // Reset all
        g.selectAll<SVGGElement, GraphNode>(".node").style("opacity", 1);
        g.selectAll<SVGLineElement, GraphEdge>(".link")
          .style("opacity", 0.6)
          .attr("stroke-width", (d) => Math.max(1, d.strength * 3));
      });

    // Render Nodes
    const node = g
      .selectAll<SVGGElement, GraphNode>(".node")
      .data(nodes, (d) => d.id)
      .join("g")
      .attr("class", "node")
      .attr("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    // Node circles
    node.selectAll("circle").remove();
    node
      .append("circle")
      .attr("r", 20)
      .attr("fill", (d) => ENTITY_CONFIG[d.type as string]?.color || "#64748b")
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 2)
      .attr("filter", "drop-shadow(0 4px 6px rgba(0,0,0,0.3))");

    // Node Icons (Text fallback)
    node.selectAll("text").remove();
    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "white")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("pointer-events", "none")
      .text((d) => d.type.substring(0, 1).toUpperCase());

    // Labels on hover
    node.append("title").text((d) => d.label || d.id);

    // Node hover: highlight connected edges
    node
      .on("mouseenter", function (_event, d) {
        // Dim everything
        g.selectAll<SVGGElement, GraphNode>(".node").style("opacity", 0.2);
        g.selectAll<SVGLineElement, GraphEdge>(".link").style("opacity", 0.1);

        // Highlight this node
        d3.select(this).style("opacity", 1);

        // Find connected edges and highlight them + their endpoints
        g.selectAll<SVGLineElement, GraphEdge>(".link")
          .filter((e) => {
            const sourceId =
              typeof e.source === "object"
                ? (e.source as GraphNode).id
                : e.source;
            const targetId =
              typeof e.target === "object"
                ? (e.target as GraphNode).id
                : e.target;
            return sourceId === d.id || targetId === d.id;
          })
          .style("opacity", 0.8)
          .attr("stroke-width", (e) => Math.max(2, e.strength * 4))
          .each(function (e) {
            const sourceId =
              typeof e.source === "object"
                ? (e.source as GraphNode).id
                : e.source;
            const targetId =
              typeof e.target === "object"
                ? (e.target as GraphNode).id
                : e.target;
            const neighborId =
              sourceId === d.id ? targetId : sourceId;

            g.selectAll<SVGGElement, GraphNode>(".node")
              .filter((n) => n.id === neighborId)
              .style("opacity", 1);
          });
      })
      .on("mouseleave", function () {
        g.selectAll<SVGGElement, GraphNode>(".node").style("opacity", 1);
        g.selectAll<SVGLineElement, GraphEdge>(".link")
          .style("opacity", 0.6)
          .attr("stroke-width", (d) => Math.max(1, d.strength * 3));
      });

    // Click handler
    node.on("click", (event, d) => {
      event.stopPropagation();
      onNodeClick?.(d);
    });

    // Background click
    svg.on("click", (event) => {
      if (event.target === svg.node()) {
        onBackgroundClick?.();
      }
    });

    // Tick function
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as GraphNode).x!)
        .attr("y1", (d) => (d.source as GraphNode).y!)
        .attr("x2", (d) => (d.target as GraphNode).x!)
        .attr("y2", (d) => (d.target as GraphNode).y!);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    simulation.alpha(1).restart();
  }, [nodes, edges, width, height]);

  // Handle highlighting
  useEffect(() => {
    if (!svgRef.current || !highlightedNodeId) return;

    const svg = d3.select(svgRef.current);
    const node = svg.selectAll<SVGGElement, GraphNode>(".node");

    // Reset all
    node
      .select("circle")
      .transition()
      .duration(300)
      .attr("r", 20)
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 2);

    if (highlightedNodeId) {
      const target = node.filter((d) => d.id === highlightedNodeId);

      target
        .select("circle")
        .transition()
        .duration(300)
        .attr("r", 30)
        .attr("stroke", "#white")
        .attr("stroke-width", 4);
    }
  }, [highlightedNodeId]);

  // Update Dimensions
  useEffect(() => {
    simulationRef.current?.force(
      "center",
      d3.forceCenter(width / 2, height / 2),
    );
    simulationRef.current?.alpha(0.3).restart();
  }, [width, height]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="w-full h-full cursor-move"
    />
  );
};
