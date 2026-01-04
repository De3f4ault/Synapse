/**
 * Assistant Module - Public API
 * 
 * This is the ONLY entry point for the assistant module.
 * No deep imports across modules allowed.
 * 
 * Architecture:
 * - components/ → UI composition (DashboardAssistant container + sub-components)
 * - hooks/      → API operations (useAssistant)
 * - state/      → Zustand store (assistantStore)
 * 
 * The assistant is a subsystem, not a widget.
 * Original 731-line monolith decomposed into focused modules.
 */

// Main Component (primary export)
export { DashboardAssistant } from "./components";

// Hooks
export { useAssistant } from "./hooks";

// State (selectors for external use)
export {
    useAssistantStore,
    useAssistantOpen,
    useAssistantMinimized,
    useAssistantActions,
    type UIMessage,
    type AssistantSession,
} from "./state";
