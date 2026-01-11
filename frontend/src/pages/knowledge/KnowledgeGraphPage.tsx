import React, { useState, useMemo, useEffect, useRef } from "react";
import { useKnowledgeGraph } from "./hooks/useKnowledgeGraph";
import { KnowledgeGraph } from "./components/KnowledgeGraph";
import { KnowledgeSidebar } from "./components/KnowledgeSidebar";
import { NodeDetailsPanel } from "./components/NodeDetailsPanel";
import { GraphNode, ENTITY_CONFIG } from "./types";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MenuIcon, PanelLeftIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { AuroraBackground } from "@/shared/ui";
export const KnowledgeGraphPage: React.FC = () => {
  // State
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>(
    Object.keys(ENTITY_CONFIG),
  );
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });

  // Sidebar State
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Load sidebar state
  useEffect(() => {
    const saved = localStorage.getItem("knowledgeSidebarCollapsed");
    if (saved) {
      setSidebarCollapsed(JSON.parse(saved));
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem("knowledgeSidebarCollapsed", JSON.stringify(newState));
  };

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

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
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
    const validNodes = data.nodes.filter((n) =>
      activeFilters.includes(n.type as string),
    );
    const validNodeIds = new Set(validNodes.map((n) => n.id));

    // 2. Filter Edges (both source and target must exist)
    const validEdges = data.edges.filter((e) => {
      // D3 mutates source/target to objects, but initially they are strings
      // We need to handle both cases safely
      // However, since we recreate the array on every render from `data`,
      // `data.edges` might still have strings if we didn't mutate IT directly.
      // But `useKnowledgeGraph` returns new objects.
      // Let's assume strings for the filter check first.
      const sourceId =
        typeof e.source === "object" ? (e.source as GraphNode).id : e.source;
      const targetId =
        typeof e.target === "object" ? (e.target as GraphNode).id : e.target;
      return (
        validNodeIds.has(sourceId as string) &&
        validNodeIds.has(targetId as string)
      );
    });

    // 3. Search Filter (if query exists, maybe just highlight? Or filter exclusive?)
    // Let's just use Search to highlight for now, not filter out.
    // It's handled by `highlightedNodeId`.

    // allow disconnected nodes
    return { nodes: validNodes, edges: validEdges };
  }, [data, activeFilters]);

  // Derived State for Search
  const highlightedNodeId = useMemo(() => {
    if (!searchQuery.trim() || !data) return null;
    const query = searchQuery.toLowerCase();
    // Simple name match
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

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <AuroraBackground
      className="flex h-screen overflow-hidden text-slate-200"
      fixed
    >
      <div className="flex flex-1 w-full h-full overflow-hidden">
        {/* Desktop Sidebar - Retractable */}
        <div
          className={cn(
            "hidden md:block transition-all duration-300 ease-in-out relative z-10",
            sidebarCollapsed ? "w-0" : "w-64",
          )}
        >
          <KnowledgeSidebar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeFilters={activeFilters}
            onToggleFilter={handleToggleFilter}
            onRefresh={refetch}
            stats={data?.stats}
            className="h-full border-r border-white/5 w-64"
            isCollapsed={sidebarCollapsed}
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
                onRefresh={refetch}
                stats={data?.stats}
                className="h-full w-64"
                isCollapsed={sidebarCollapsed}
              />
            </SheetContent>
          </Sheet>
        </div>
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Floating Header Actions */}
          <div className="absolute top-4 left-4 z-50 flex items-center gap-2 pointer-events-none">
            {/* Desktop Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="hidden md:flex pointer-events-auto hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              <PanelLeftIcon className="size-5" />
            </Button>

            {/* Mobile Hamburger */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden pointer-events-auto hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              <MenuIcon className="size-5" />
            </Button>
          </div>

          {/* Graph Area */}
          <div ref={containerRef} className="flex-1 w-full h-full min-h-0">
            {containerDimensions.width > 0 && containerDimensions.height > 0 && (
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
    </AuroraBackground>
  );
};

// Also export default for lazy loading
export default KnowledgeGraphPage;
