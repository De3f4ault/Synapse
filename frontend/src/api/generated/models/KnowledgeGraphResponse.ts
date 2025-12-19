/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GraphEdge } from './GraphEdge';
import type { GraphNode } from './GraphNode';
import type { GraphStats } from './GraphStats';
/**
 * Knowledge graph data for visualization.
 */
export type KnowledgeGraphResponse = {
    nodes: Array<GraphNode>;
    edges: Array<GraphEdge>;
    stats: GraphStats;
};

