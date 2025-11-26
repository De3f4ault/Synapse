/**
 * Graph node representing a resource (document, note, flashcard, etc.)
 */
export interface GraphNode {
    id: string; // Format: "type-id" (e.g., "doc-123")
    type: 'document' | 'note' | 'flashcard' | 'chat' | 'quiz';
    label: string;
    size: number; // Visual size based on importance
    color: string;
    metadata: {
        moduleId: number;
        created: string;
        lastAccessed?: string;
        connections: number;
        mastery?: number; // 0-1 for flashcards
        accuracy?: number; // 0-1 for flashcards
        [key: string]: unknown;
    };
    x?: number; // D3 force layout position
    y?: number;
    vx?: number; // Velocity
    vy?: number;
    fx?: number | null; // Fixed position
    fy?: number | null;
}

/**
 * Graph link representing a relationship between nodes
 */
export interface GraphLink {
    id: string;
    source: string | GraphNode; // Node ID or node object (D3 transforms this)
    target: string | GraphNode;
    type: 'derived_from' | 'generated_from' | 'referenced_in' | 'related_to';
    strength: number; // 0-1 connection strength
    label?: string;
}

/**
 * Complete graph structure
 */
export interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

/**
 * Graph filter options
 */
export interface GraphFilter {
    modules: Set<string>; // Which module types to show
    timeRange?: {
        start: Date;
        end: Date;
    };
    searchQuery?: string;
    showMastered?: boolean; // Show/hide mastered flashcards
}

/**
 * Graph layout configuration
 */
export interface GraphConfig {
    width: number;
    height: number;
    simulation: {
        charge: number; // Node repulsion (-300)
        linkDistance: number; // Link length (100)
        collisionRadius: number; // Prevent overlap (50)
    };
    viewport: {
        minZoom: number; // 0.5
        maxZoom: number; // 3
        initialZoom: number; // 1
    };
}

/**
 * Node detail modal data
 */
export interface NodeDetail {
    node: GraphNode;
    connections: {
        incoming: GraphNode[];
        outgoing: GraphNode[];
    };
    content?: {
        preview: string;
        fullContent?: string;
    };
}
