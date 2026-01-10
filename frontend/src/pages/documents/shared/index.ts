/**
 * Document Shared Module - Public API
 *
 * Cross-cutting concerns that don't belong to any specific module.
 *
 * Shared owns:
 * - Generic UI components usable across document modules
 * - Utility functions for chunk processing
 *
 * Shared does NOT own:
 * - Document-specific logic (that belongs in core/list/upload/viewer)
 */

// Components
export { DocumentStats, FilterBar } from "./components";

// Utils
export {
    splitIntoChunks,
    processChunks,
    getChunkMetadata,
    searchChunks,
    getChunkStatistics,
    mergeChunks,
} from "./utils";
