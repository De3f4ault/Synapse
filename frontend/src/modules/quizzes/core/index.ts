/**
 * Quiz Module - Core
 *
 * Public API for the quizzes core layer.
 * This barrel file exports all types, constants, and utilities.
 */

// Types
export * from "./types";

// Lifecycle (FSM)
export * from "./lifecycle";

// Constants & Invariants
export * from "./constants";

// Events
export * from "./events";

// Note: learningApi is NOT re-exported here to avoid dynamic import issues.
// Import directly: import { getRelatedFlashcards } from "./learningApi";


