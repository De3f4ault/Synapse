/**
 * Chat hooks exports
 * Central export point for all chat hooks
 *
 * UPDATED: Replaced useStreamingResponse with useChatStreaming
 */

// Session management
export { useChatSession } from './useChatSession';

// Message handling
export { useChatMessages } from './useChatMessages';

// Streaming - NEW unified hook
export { useChatStreaming } from './useChatStreaming';

// File handling
export { useFileUpload } from './useFileUpload';

// UI state
export { usePreviewSidebar } from './usePreviewSidebar';
export { useSidebarCollapse } from './useSidebarCollapse';

// Message interactions
export { useAutoScroll } from './useAutoScroll';
export { useMessageActions } from './useMessageActions';

// Keyboard shortcuts
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
