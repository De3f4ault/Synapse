import { SimulationNodeDatum, SimulationLinkDatum } from "d3";
import {
  FileText,
  Layers,
  BookOpen,
  HelpCircle,
  MessageSquare,
} from "lucide-react";
import { GraphNode as ApiGraphNode } from "../../api/generated/models/GraphNode";
import { GraphEdge as ApiGraphEdge } from "../../api/generated/models/GraphEdge";

// ==================== DOMAIN TYPES ====================

export type EntityType =
  | "note"
  | "deck"
  | "document"
  | "quiz"
  | "flashcard"
  | "chat_session";

// Extend API types with D3 simulation properties
export interface GraphNode extends ApiGraphNode, SimulationNodeDatum {
  // Override type to be more specific if possible, otherwise string is fine
  type: EntityType | string;
  label?: string;
  // D3 properties
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge
  extends
    Omit<ApiGraphEdge, "source" | "target">,
    SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  // D3 properties
  index?: number;
}

// ==================== CONFIGURATION ====================

export const ENTITY_CONFIG: Record<
  string,
  { color: string; icon: React.ElementType; path: string; label: string }
> = {
  note: { color: "#06b6d4", icon: FileText, path: "/notes", label: "Notes" },
  deck: { color: "#8b5cf6", icon: Layers, path: "/flashcards", label: "Decks" },
  document: {
    color: "#f59e0b",
    icon: BookOpen,
    path: "/documents",
    label: "Documents",
  },
  quiz: {
    color: "#10b981",
    icon: HelpCircle,
    path: "/quizzes",
    label: "Quizzes",
  },
  flashcard: {
    color: "#ec4899",
    icon: Layers,
    path: "/flashcards",
    label: "Flashcards",
  },
  chat_session: {
    color: "#6366f1",
    icon: MessageSquare,
    path: "/chat",
    label: "Chats",
  },
};

export const LINK_COLORS: Record<string, string> = {
  manual: "#ffffff",
  mention: "#06b6d4",
  derived: "#8b5cf6",
  semantic: "#10b981",
  suggested: "#f59e0b",
};
