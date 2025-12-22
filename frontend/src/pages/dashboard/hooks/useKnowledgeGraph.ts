import { useMemo, useState, useCallback } from "react";
import type { DashboardData } from "../types/dashboard.types";
import type {
  GraphData,
  GraphNode,
  GraphLink,
  GraphFilters,
} from "../types/graph.types";
import {
  transformDocumentsToNodes,
  transformNotesToNodes,
  transformFlashcardsToNodes,
  transformChatsToNodes,
  transformQuizzesToNodes,
  inferConnections,
} from "../utils/graphTransformers";

/**
 * useKnowledgeGraph Hook
 *
 * Transforms dashboard data into D3-compatible graph structure:
 * - Creates nodes for all resources (docs, notes, cards, chats, quizzes)
 * - Infers connections between resources
 * - Provides filtering and search functionality
 * - Manages graph interactions (zoom, focus, selection)
 */
export function useKnowledgeGraph(data: DashboardData | undefined) {
  const [filters, setFilters] = useState<GraphFilters>({
    showDocuments: true,
    showNotes: true,
    showFlashcards: true,
    showChats: true,
    showQuizzes: true,
    searchQuery: "",
  });

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Transform all data into graph structure
  const graphData = useMemo((): GraphData => {
    if (!data) {
      return { nodes: [], links: [] };
    }

    const allNodes: GraphNode[] = [];

    // Transform each resource type to nodes
    if (filters.showDocuments && data.documents) {
      allNodes.push(...transformDocumentsToNodes(data.documents));
    }

    if (filters.showNotes && data.notes) {
      allNodes.push(...transformNotesToNodes(data.notes));
    }

    if (filters.showFlashcards && data.dueCards) {
      // For flashcards, we show due cards as a sample
      allNodes.push(...transformFlashcardsToNodes(data.dueCards));
    }

    if (filters.showChats && data.chatSessions) {
      allNodes.push(...transformChatsToNodes(data.chatSessions));
    }

    if (filters.showQuizzes && data.quizzes) {
      allNodes.push(...transformQuizzesToNodes(data.quizzes));
    }

    // Apply search filter
    const filteredNodes = filters.searchQuery
      ? allNodes.filter((node) =>
          node.label.toLowerCase().includes(filters.searchQuery.toLowerCase()),
        )
      : allNodes;

    // Infer connections between nodes
    const links = inferConnections(filteredNodes, data);

    return {
      nodes: filteredNodes,
      links,
    };
  }, [data, filters]);

  // Filter controls
  const toggleFilter = useCallback((filterKey: keyof GraphFilters) => {
    if (filterKey === "searchQuery") return;
    setFilters((prev) => ({
      ...prev,
      [filterKey]: !prev[filterKey],
    }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({
      ...prev,
      searchQuery: query,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      showDocuments: true,
      showNotes: true,
      showFlashcards: true,
      showChats: true,
      showQuizzes: true,
      searchQuery: "",
    });
  }, []);

  // Node interactions
  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
  }, []);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredNode(node);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Get connected nodes for highlighting
  const connectedNodeIds = useMemo(() => {
    if (!selectedNode && !hoveredNode) return new Set<string>();

    const targetNode = hoveredNode || selectedNode;
    if (!targetNode) return new Set<string>();

    const connected = new Set<string>([targetNode.id]);

    graphData.links.forEach((link) => {
      const sourceId =
        typeof link.source === "string" ? link.source : link.source.id;
      const targetId =
        typeof link.target === "string" ? link.target : link.target.id;

      if (sourceId === targetNode.id) {
        connected.add(targetId);
      }
      if (targetId === targetNode.id) {
        connected.add(sourceId);
      }
    });

    return connected;
  }, [graphData.links, selectedNode, hoveredNode]);

  // Statistics
  const stats = useMemo(() => {
    return {
      totalNodes: graphData.nodes.length,
      totalLinks: graphData.links.length,
      nodesByType: {
        documents: graphData.nodes.filter((n) => n.type === "document").length,
        notes: graphData.nodes.filter((n) => n.type === "note").length,
        flashcards: graphData.nodes.filter((n) => n.type === "flashcard")
          .length,
        chats: graphData.nodes.filter((n) => n.type === "chat").length,
        quizzes: graphData.nodes.filter((n) => n.type === "quiz").length,
      },
      avgConnections:
        graphData.nodes.length > 0
          ? (graphData.links.length * 2) / graphData.nodes.length
          : 0,
    };
  }, [graphData]);

  return {
    graphData,
    filters,
    toggleFilter,
    setSearchQuery,
    resetFilters,
    selectedNode,
    hoveredNode,
    handleNodeClick,
    handleNodeHover,
    clearSelection,
    connectedNodeIds,
    stats,
    isLoading: !data,
    isEmpty: graphData.nodes.length === 0,
  };
}
