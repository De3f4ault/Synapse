import type { GraphNode as GraphNodeType } from '../../types/graph.types';
import {
    FileText,
    StickyNote,
    Zap, // Replaces CreditCard for Flashcards (Sci-Fi Theme)
    MessageSquare,
    ClipboardList
} from 'lucide-react';

interface GraphNodeProps {
    node: GraphNodeType;
    isSelected?: boolean;
    isHovered?: boolean;
    isConnected?: boolean;
    onClick?: () => void;
    onHover?: (hover: boolean) => void;
}

/**
 * GraphNode - Helper utilities
 * Rendering is handled by D3 in GraphCanvas, but these helpers ensure consistent icons/colors.
 */
export function GraphNode({ node }: GraphNodeProps) {
    return null;
}

/**
 * Get icon component for node type
 * Updated to use Lucide icons matching the Sci-Fi template.
 */
export function getNodeIcon(type: string) {
    switch (type) {
        case 'document':
            return FileText;
        case 'note':
            return StickyNote;
        case 'flashcard':
            return Zap; // Matches "Energy/Flash" metaphor
        case 'chat':
            return MessageSquare;
        case 'quiz':
            return ClipboardList;
        default:
            return FileText;
    }
}

/**
 * Get status badge for node
 */
export function getNodeStatus(node: GraphNodeType): {
    label: string;
    color: string;
} | null {
    const metadata = node.metadata;

    if (node.type === 'flashcard') {
        if (metadata.learningState === 'mastered') {
            return { label: 'Mastered', color: '#10b981' }; // Emerald
        }
        if (metadata.nextReview && new Date(metadata.nextReview) < new Date()) {
            return { label: 'Due', color: '#ef4444' }; // Red
        }
        if (metadata.learningState === 'learning') {
            return { label: 'Active', color: '#3b82f6' }; // Blue
        }
    }
    return null;
}
