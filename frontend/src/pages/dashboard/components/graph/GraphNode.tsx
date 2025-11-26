import type { GraphNode as GraphNodeType } from '../../types/graph.types';
import { FileText, StickyNote, CreditCard, MessageSquare, ClipboardList } from 'lucide-react';

interface GraphNodeProps {
    node: GraphNodeType;
    isSelected?: boolean;
    isHovered?: boolean;
    isConnected?: boolean;
    onClick?: () => void;
    onHover?: (hover: boolean) => void;
}

/**
 * GraphNode - Individual SVG node component
 *
 * This component is primarily used for type definitions and helpers.
 * The actual rendering is done in GraphCanvas using D3.
 *
 * Features:
 * - Type-specific icons
 * - Status badges (due, mastered, etc.)
 * - Pulse animation for active items
 * - Color coding by module
 */
export function GraphNode({
    node,
    isSelected,
    isHovered,
    isConnected,
    onClick,
    onHover
}: GraphNodeProps) {
    // This is a placeholder component - actual rendering happens in D3
    return null;
}

/**
 * Get icon component for node type
 */
export function getNodeIcon(type: string) {
    switch (type) {
        case 'document':
            return FileText;
        case 'note':
            return StickyNote;
        case 'flashcard':
            return CreditCard;
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

    // Flashcard statuses
    if (node.type === 'flashcard') {
        if (metadata.learningState === 'mastered') {
            return { label: 'Mastered', color: '#10b981' };
        }
        if (metadata.nextReview && new Date(metadata.nextReview) < new Date()) {
            return { label: 'Due', color: '#ef4444' };
        }
        if (metadata.learningState === 'learning') {
            return { label: 'Learning', color: '#3b82f6' };
        }
    }

    // Document statuses
    if (node.type === 'document') {
        if (metadata.processingStatus === 'processing') {
            return { label: 'Processing', color: '#f59e0b' };
        }
        if (metadata.processingStatus === 'failed') {
            return { label: 'Failed', color: '#ef4444' };
        }
    }

    // Note statuses
    if (node.type === 'note') {
        if (metadata.contentLength < 200) {
            return { label: 'Incomplete', color: '#f59e0b' };
        }
    }

    return null;
}

/**
 * Calculate pulse animation for active nodes
 */
export function shouldPulse(node: GraphNodeType): boolean {
    const metadata = node.metadata;

    // Pulse for due flashcards
    if (node.type === 'flashcard' && metadata.nextReview) {
        return new Date(metadata.nextReview) < new Date();
    }

    // Pulse for processing documents
    if (node.type === 'document' && metadata.processingStatus === 'processing') {
        return true;
    }

    return false;
}
