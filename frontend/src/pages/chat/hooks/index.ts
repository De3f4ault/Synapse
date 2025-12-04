/**
 * Chat hooks exports
 * Central export point for all chat hooks
<<<<<<< HEAD
 *
 * UPDATED: Replaced useStreamingResponse with useChatStreaming
=======
>>>>>>> 0beb317ceabb56c602374af9c5a336f24e73e32a
 */

// Session management
export { useChatSession } from './useChatSession';

// Message handling
export { useChatMessages } from './useChatMessages';

<<<<<<< HEAD
// Streaming - NEW unified hook
export { useChatStreaming } from './useChatStreaming';
=======
// Streaming
export { useStreamingResponse } from './useStreamingResponse';
>>>>>>> 0beb317ceabb56c602374af9c5a336f24e73e32a

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
