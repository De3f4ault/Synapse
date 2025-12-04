import type { GraphConfig } from '../types/graph.types';

/**
 * D3 force-directed graph configuration
 */
export const GRAPH_CONFIG: Omit<GraphConfig, 'width' | 'height'> = {
    simulation: {
        charge: -300, // Node repulsion (negative = repel)
        linkDistance: 100, // Ideal link length
        collisionRadius: 50, // Prevent node overlap
    },
    viewport: {
        minZoom: 0.5,
        maxZoom: 3,
        initialZoom: 1,
    },
};

/**
 * Node size calculation based on importance
 */
export const NODE_SIZE = {
    min: 8,
    max: 24,
    default: 12,
} as const;

/**
 * Link styling
 */
export const LINK_STYLE = {
    width: {
        min: 1,
        max: 4,
    default: 2,
    },
    opacity: {
    default: 0.6,
        hover: 1,
        inactive: 0.2,
    },
} as const;

/**
 * Animation durations (ms)
 */
export const GRAPH_ANIMATION = {
    nodeEnter: 300,
    nodeExit: 200,
    linkEnter: 400,
    linkExit: 200,
    zoomTransition: 500,
    filterTransition: 300,
} as const;
