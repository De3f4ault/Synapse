/**
 * Shared Module - Public API
 *
 * This is the cross-module contract layer.
 * Import from here, not from subdirectories directly.
 */

// Events - Cross-module communication
export * from "./events";

// Entities - Universal entity references
export * from "./entities";

// Time - Clock and duration utilities
export * from "./time";

// Async - Async state machine
export * from "./async";

// Errors - Error types and handling
export * from "./errors";

// Rendering - Markdown, code blocks, etc.
export * from "./rendering";

// UI - State components, backgrounds
export * from "./ui";

