import React, { useState, useMemo, useEffect, useRef } from "react";
import { useKnowledgeGraph } from "./hooks/useKnowledgeGraph";
import { KnowledgeGraph } from "./components/KnowledgeGraph";
import { KnowledgeSidebar } from "./components/KnowledgeSidebar";
import { NodeDetailsPanel } from "./components/NodeDetailsPanel";
import { GraphNode, ENTITY_CONFIG, LINK_COLORS } from "./types";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MenuIcon, Loader2 } from "lucide-react";

import { PlatformService } from "@/api/generated";
import { toast } from "sonner";

export const KnowledgeGraphPage: React.FC = () => {
  // State
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>(
    Object.keys(ENTITY_CONFIG),
  );
  const [activeLinkTypes, setActiveLinkTypes] = useState<string[]>(
    Object.keys(LINK_COLORS),
  );
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sidebar State
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);

  // Data Fetching
  const { data, isLoading, refetch } = useKnowledgeGraph({});

  // Semantic Refresh Handler
  const handleSemanticRefresh = async () => {
    setIsRefreshing(true);
    try {
      await PlatformService.refreshSemanticLinksApiV1GraphRefreshPost();
      toast.success("Semantic scan queued", {
        description: "Your knowledge graph connections will update shortly.",
      });
      // Refetch after a brief delay to let the task start
      setTimeout(() => refetch(), 2000);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";
      if (errorMessage.includes("429") || errorMessage.includes("rate")) {
        toast.error("Rate limited", {
          description: "You can refresh once per hour. Try again later.",
        });
      } else {
        toast.error("Refresh failed", {
          description: "Could not queue semantic refresh.",
        });
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle Resize
  // NOTE: isLoading is intentionally included as a dependency.
  // The early-return pattern causes containerRef.current to be null on first
  // mount (the LoadingScreen renders instead of the full layout). Adding
  // isLoading ensures the observer is (re-)attached once the real layout mounts.
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [isLoading]); // re-run when loading state changes so observer attaches after layout renders

  // Filter Data — entity type + link type filtering
  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };

    // 1. Filter by Entity Type — normalize type to lowercase so casing from
    //    the API (e.g. "Note" vs "note") never causes false negatives.
    //    Deep-clone each node/edge so D3 is free to mutate (add x, y, vx, vy)
    //    without touching the React Query cached objects.
    const validNodes = data.nodes
      .filter((n) => activeFilters.includes((n.type as string).toLowerCase()))
      .map((n) => ({ ...n, type: (n.type as string).toLowerCase() })) as GraphNode[];

    const validNodeIds = new Set(validNodes.map((n) => n.id));

    // 2. Filter Edges by both endpoints existing AND link type
    const validEdges = data.edges
      .filter((e) => {
        const sourceId =
          typeof e.source === "object" ? (e.source as GraphNode).id : e.source;
        const targetId =
          typeof e.target === "object" ? (e.target as GraphNode).id : e.target;

        const nodesExist =
          validNodeIds.has(sourceId as string) &&
          validNodeIds.has(targetId as string);

        const linkTypeActive = activeLinkTypes.includes(
          (e.type as string).toLowerCase(),
        );

        return nodesExist && linkTypeActive;
      })
      .map((e) => ({ ...e, type: (e.type as string).toLowerCase() })) as GraphEdge[];

    return { nodes: validNodes, edges: validEdges };
  }, [data, activeFilters, activeLinkTypes]);

  // Derived State for Search
  const highlightedNodeId = useMemo(() => {
    if (!searchQuery.trim() || !data) return null;
    const query = searchQuery.toLowerCase();
    const found = data.nodes.find(
      (n: GraphNode) =>
        n.label?.toLowerCase().includes(query) ||
        (n.type as string).includes(query) ||
        String(n.entity_id).includes(query),
    );
    return found ? found.id : null;
  }, [searchQuery, data]);

  // Handlers
  const handleToggleFilter = (type: string) => {
    setActiveFilters((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleToggleLinkType = (type: string) => {
    setActiveLinkTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };


  return (
    <div className="flex h-screen overflow-hidden text-foreground/70 bg-background">
      <div className="flex flex-1 w-full h-full overflow-hidden">
        {/* Desktop Sidebar — SidebarShell handles collapse */}
        <div className="hidden md:flex transition-all duration-300 ease-in-out relative z-10">
          <KnowledgeSidebar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeFilters={activeFilters}
            onToggleFilter={handleToggleFilter}
            activeLinkTypes={activeLinkTypes}
            onToggleLinkType={handleToggleLinkType}
            onRefresh={handleSemanticRefresh}
            isRefreshing={isRefreshing}
            stats={data?.stats}
          />
        </div>

        {/* Mobile Sidebar (Drawer) */}
        <div className="md:hidden">
          <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
            <SheetContent
              side="left"
              className="w-64 p-0 border-none [&>button]:hidden bg-transparent"
            >
              <KnowledgeSidebar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activeFilters={activeFilters}
                onToggleFilter={handleToggleFilter}
                activeLinkTypes={activeLinkTypes}
                onToggleLinkType={handleToggleLinkType}
                onRefresh={handleSemanticRefresh}
                isRefreshing={isRefreshing}
                stats={data?.stats}
                className="h-full w-64"
              />
            </SheetContent>
          </Sheet>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Floating Header Actions */}
          <div className="absolute top-4 left-4 z-50 flex items-center gap-2 pointer-events-none">
            {/* Mobile Hamburger */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden pointer-events-auto hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-colors"
            >
              <MenuIcon className="size-5" />
            </Button>
          </div>

          {/* Graph Area */}
          <div ref={containerRef} className="flex-1 w-full h-full min-h-0">
            {isLoading ? (
              // Loading state rendered INSIDE the container so containerRef is
              // always in the DOM when the ResizeObserver effect fires.
              <div className="flex items-center justify-center w-full h-full">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-sm">Building knowledge graph…</span>
                </div>
              </div>
            ) : (
              containerDimensions.width > 0 && containerDimensions.height > 0 && (
                <KnowledgeGraph
                  nodes={nodes}
                  edges={edges}
                  width={containerDimensions.width}
                  height={containerDimensions.height}
                  onNodeClick={setSelectedNode}
                  onBackgroundClick={() => setSelectedNode(null)}
                  highlightedNodeId={highlightedNodeId}
                />
              )
            )}
          </div>
        </div>
      </div>

      {/* Details Panel */}
      {selectedNode && (
        <NodeDetailsPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          className="z-50"
        />
      )}
    </div>
  );
};

// Also export default for lazy loading
export default KnowledgeGraphPage;
