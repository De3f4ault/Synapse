import React, { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import { GraphNode, GraphEdge, ENTITY_CONFIG, LINK_COLORS } from "../types";
import { Crosshair } from "lucide-react";

interface KnowledgeGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width?: number;
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
  onBackgroundClick?: () => void;
  highlightedNodeId?: string | null;
}

const NODE_RADIUS_MIN = 10;
const NODE_RADIUS_MAX = 32;
const LABEL_MAX_LEN = 18;

function truncate(str: string | null | undefined, max: number): string {
  if (!str) return "";
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
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
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // ── Fit-to-view helper ──────────────────────────────────────────────────
  const fitToView = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    const g = svg.select<SVGGElement>(".main-group");
    const bbox = (g.node() as SVGGElement | null)?.getBBox();
    if (!bbox || bbox.width === 0 || bbox.height === 0) return;

    const padding = 60;
    const scale = Math.min(
      0.95,
      Math.min(
        (width - padding * 2) / bbox.width,
        (height - padding * 2) / bbox.height,
      ),
    );
    const tx = width / 2 - scale * (bbox.x + bbox.width / 2);
    const ty = height / 2 - scale * (bbox.y + bbox.height / 2);

    svg
      .transition()
      .duration(600)
      .call(
        zoomRef.current.transform,
        d3.zoomIdentity.translate(tx, ty).scale(scale),
      );
  }, [width, height]);

  // ── Initial SVG setup (once) ─────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g").attr("class", "main-group");

    // Arrow markers — one per link type color
    const defs = svg.append("defs");
    Object.entries(LINK_COLORS).forEach(([type, color]) => {
      defs
        .append("marker")
        .attr("id", `arrow-${type}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 28)
        .attr("refY", 0)
        .attr("markerWidth", 5)
        .attr("markerHeight", 5)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", color);
    });
    // Fallback marker
    defs
      .append("marker")
      .attr("id", "arrow-default")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 28)
      .attr("refY", 0)
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#475569");

    // Glow filter for highlighted node
    const glowFilter = defs
      .append("filter")
      .attr("id", "glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    glowFilter
      .append("feGaussianBlur")
      .attr("stdDeviation", "4")
      .attr("result", "coloredBlur");
    const feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 10])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);
    zoomRef.current = zoom;

    // Background click
    svg.on("click", (event) => {
      if (event.target === svg.node()) onBackgroundClick?.();
    });

    // Simulation
    simulationRef.current = d3
      .forceSimulation<GraphNode, GraphEdge>()
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphEdge>()
          .id((d) => d.id)
          .distance(120)
          .strength(0.4),
      )
      .force("charge", d3.forceManyBody().strength(-350).distanceMax(500))
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.08))
      .force("collide", d3.forceCollide<GraphNode>().radius((d) => (d as any)._r + 14).strength(0.8))
      .alphaDecay(0.03)
      .velocityDecay(0.4);

    return () => {
      simulationRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update graph data ───────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current || !simulationRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = svg.select<SVGGElement>(".main-group");
    const simulation = simulationRef.current;

    // Compute degree for each node
    const degreeMap = new Map<string, number>();
    nodes.forEach((n) => degreeMap.set(n.id, 0));
    edges.forEach((e) => {
      const src = typeof e.source === "object" ? (e.source as GraphNode).id : e.source as string;
      const tgt = typeof e.target === "object" ? (e.target as GraphNode).id : e.target as string;
      degreeMap.set(src, (degreeMap.get(src) ?? 0) + 1);
      degreeMap.set(tgt, (degreeMap.get(tgt) ?? 0) + 1);
    });
    const maxDegree = Math.max(1, ...degreeMap.values());

    const radiusScale = d3
      .scaleSqrt()
      .domain([0, maxDegree])
      .range([NODE_RADIUS_MIN, NODE_RADIUS_MAX]);

    // Stamp radius onto each node so the collision force can read it
    nodes.forEach((n) => {
      (n as any)._r = radiusScale(degreeMap.get(n.id) ?? 0);
    });

    // Update collision radii
    (simulation.force("collide") as d3.ForceCollide<GraphNode>).radius(
      (d) => (d as any)._r + 14,
    );

    simulation.nodes(nodes);
    (simulation.force("link") as d3.ForceLink<GraphNode, GraphEdge>).links(edges);

    // ── Edges (curved paths) ──
    const link = g
      .selectAll<SVGPathElement, GraphEdge>(".link")
      .data(edges, (d) => String(d.id))
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("class", "link")
            .attr("fill", "none")
            .attr("opacity", 0)
            .call((e) => e.transition().duration(400).attr("opacity", 0.55)),
        (update) => update,
        (exit) => exit.transition().duration(200).attr("opacity", 0).remove(),
      )
      .attr("stroke", (d) => LINK_COLORS[d.type] ?? "#475569")
      .attr("stroke-opacity", 0.55)
      .attr("stroke-width", (d) => Math.max(1, d.strength * 2.5))
      .attr("marker-end", (d) => `url(#arrow-${d.type in LINK_COLORS ? d.type : "default"})`);

    // Edge tooltips
    link
      .selectAll("title")
      .data((d) => [d])
      .join("title")
      .text((d) => {
        const src =
          typeof d.source === "object"
            ? (d.source as GraphNode).label || (d.source as GraphNode).id
            : d.source;
        const tgt =
          typeof d.target === "object"
            ? (d.target as GraphNode).label || (d.target as GraphNode).id
            : d.target;
        return `${src} → ${tgt}\n${d.type} · ${Math.round(d.strength * 100)}%`;
      });

    // Edge hover
    link
      .on("mouseenter", function (_event, d) {
        g.selectAll<SVGGElement, GraphNode>(".node").style("opacity", 0.15);
        g.selectAll<SVGPathElement, GraphEdge>(".link").style("opacity", 0.05);
        d3.select(this).style("opacity", 1).attr("stroke-width", Math.max(2, d.strength * 4));
        const srcId = typeof d.source === "object" ? (d.source as GraphNode).id : d.source;
        const tgtId = typeof d.target === "object" ? (d.target as GraphNode).id : d.target;
        g.selectAll<SVGGElement, GraphNode>(".node")
          .filter((n) => n.id === srcId || n.id === tgtId)
          .style("opacity", 1);
      })
      .on("mouseleave", function (_event, d) {
        g.selectAll<SVGGElement, GraphNode>(".node").style("opacity", 1);
        g.selectAll<SVGPathElement, GraphEdge>(".link")
          .style("opacity", 0.55)
          .attr("stroke-width", (d) => Math.max(1, d.strength * 2.5));
      });

    // ── Nodes ──
    const node = g
      .selectAll<SVGGElement, GraphNode>(".node")
      .data(nodes, (d) => d.id)
      .join(
        (enter) => {
          const grp = enter.append("g").attr("class", "node").attr("cursor", "pointer");
          grp.append("circle").attr("class", "node-circle");
          grp.append("text").attr("class", "node-label");
          return grp;
        },
        (update) => update,
        (exit) => exit.transition().duration(200).attr("opacity", 0).remove(),
      );

    // Drag
    node.call(
      d3
        .drag<SVGGElement, GraphNode>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.15).restart();
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

    // Circles
    node
      .select<SVGCircleElement>(".node-circle")
      .attr("r", (d) => (d as any)._r ?? NODE_RADIUS_MIN)
      .attr("fill", (d) => ENTITY_CONFIG[d.type]?.color ?? "#64748b")
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 2.5);

    // Labels — always visible, below the node
    node
      .select<SVGTextElement>(".node-label")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => ((d as any)._r ?? NODE_RADIUS_MIN) + 13)
      .attr("fill", "#cbd5e1")
      .attr("font-size", "10px")
      .attr("font-weight", "500")
      .attr("pointer-events", "none")
      .attr("paint-order", "stroke")
      .attr("stroke", "#0f172a")
      .attr("stroke-width", "3px")
      .attr("stroke-linejoin", "round")
      .text((d) => truncate(d.label, LABEL_MAX_LEN));

    // Click
    node.on("click", (event, d) => {
      event.stopPropagation();
      onNodeClick?.(d);
    });

    // Hover
    node
      .on("mouseenter", function (_event, d) {
        g.selectAll<SVGGElement, GraphNode>(".node").style("opacity", 0.15);
        g.selectAll<SVGPathElement, GraphEdge>(".link").style("opacity", 0.05);
        d3.select(this).style("opacity", 1);

        g.selectAll<SVGPathElement, GraphEdge>(".link")
          .filter((e) => {
            const src = typeof e.source === "object" ? (e.source as GraphNode).id : e.source;
            const tgt = typeof e.target === "object" ? (e.target as GraphNode).id : e.target;
            return src === d.id || tgt === d.id;
          })
          .style("opacity", 0.9)
          .attr("stroke-width", (e) => Math.max(2, e.strength * 4))
          .each(function (e) {
            const src = typeof e.source === "object" ? (e.source as GraphNode).id : e.source;
            const tgt = typeof e.target === "object" ? (e.target as GraphNode).id : e.target;
            const neighborId = src === d.id ? tgt : src;
            g.selectAll<SVGGElement, GraphNode>(".node")
              .filter((n) => n.id === neighborId)
              .style("opacity", 1);
          });
      })
      .on("mouseleave", function () {
        g.selectAll<SVGGElement, GraphNode>(".node").style("opacity", 1);
        g.selectAll<SVGPathElement, GraphEdge>(".link")
          .style("opacity", 0.55)
          .attr("stroke-width", (d) => Math.max(1, d.strength * 2.5));
      });

    // Curved path tick helper
    function linkArc(d: GraphEdge) {
      const src = d.source as GraphNode;
      const tgt = d.target as GraphNode;
      if (!src.x || !tgt.x) return "";
      const dx = (tgt.x ?? 0) - (src.x ?? 0);
      const dy = (tgt.y ?? 0) - (src.y ?? 0);
      const dr = Math.sqrt(dx * dx + dy * dy) * 1.6; // curvature
      return `M${src.x},${src.y}A${dr},${dr} 0 0,1 ${tgt.x},${tgt.y}`;
    }

    // Tick
    simulation.on("tick", () => {
      link.attr("d", linkArc);
      node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // Restart simulation fresh with new data
    simulation.alpha(0.8).restart();

    // Auto fit-to-view once simulation settles
    simulation.on("end", fitToView);
  }, [nodes, edges, onNodeClick, onBackgroundClick, fitToView]);

  // ── Highlight effect ────────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const nodeCircles = svg.selectAll<SVGCircleElement, GraphNode>(".node-circle");

    nodeCircles
      .transition()
      .duration(300)
      .attr("r", (d) => (d as any)._r ?? NODE_RADIUS_MIN)
      .attr("filter", null)
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 2.5);

    if (highlightedNodeId) {
      nodeCircles
        .filter((d) => d.id === highlightedNodeId)
        .transition()
        .duration(300)
        .attr("r", (d) => ((d as any)._r ?? NODE_RADIUS_MIN) * 1.4)
        .attr("filter", "url(#glow)")
        .attr("stroke", "white")
        .attr("stroke-width", 3);
    }
  }, [highlightedNodeId]);

  // ── Center force update on resize ───────────────────────────────────────
  useEffect(() => {
    simulationRef.current
      ?.force("center", d3.forceCenter(width / 2, height / 2).strength(0.08))
      .alpha(0.2)
      .restart();
  }, [width, height]);

  return (
    <div className="relative w-full h-full">
      {/* Fit-to-view button */}
      <button
        onClick={fitToView}
        title="Fit graph to view"
        className="absolute bottom-4 right-4 z-10 flex items-center justify-center w-9 h-9 rounded-xl bg-muted/80 backdrop-blur border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-md"
      >
        <Crosshair className="w-4 h-4" />
      </button>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full h-full cursor-move"
      />
    </div>
  );
};
