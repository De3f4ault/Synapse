/**
 * Shared Rendering - Public API
 *
 * INVARIANT: All exports are stateless, session-agnostic.
 * These understand STRUCTURE, not MEANING.
 */

// Schema
export * from './schema';

// Components
export { CodeBlock, LatexBlock, ExpandableBlock } from './components';

// Main renderer
export { MarkdownRenderer } from './MarkdownRenderer';

