#!/bin/bash

# ============================================================================
# Create Complete Chat Page Structure
# ============================================================================
# This script creates all necessary directories and files for the chat feature
# Run from your frontend root directory: bash create-chat-structure.sh
# ============================================================================

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Creating Chat Page Structure${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Base directory
BASE_DIR="src/pages/chat"

# ============================================================================
# Create Directory Structure
# ============================================================================

echo -e "${YELLOW}Creating directories...${NC}"

# Main directories
mkdir -p "$BASE_DIR"
mkdir -p "$BASE_DIR/components/sidebar"
mkdir -p "$BASE_DIR/components/main-area"
mkdir -p "$BASE_DIR/components/messages"
mkdir -p "$BASE_DIR/components/input"
mkdir -p "$BASE_DIR/components/preview"
mkdir -p "$BASE_DIR/components/header"
mkdir -p "$BASE_DIR/components/shared"
mkdir -p "$BASE_DIR/hooks"
mkdir -p "$BASE_DIR/styles"
mkdir -p "$BASE_DIR/utils"
mkdir -p "$BASE_DIR/types"
mkdir -p "$BASE_DIR/constants"

echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# ============================================================================
# Create Root Files
# ============================================================================

echo -e "${YELLOW}Creating root files...${NC}"

# ChatPage.tsx
cat > "$BASE_DIR/ChatPage.tsx" << 'EOF'
/**
 * ChatPage - Main orchestrator for chat interface
 * DeepSeek-inspired minimal layout
 */

import React from 'react';

export const ChatPage: React.FC = () => {
  return (
    <div className="chat-page">
      <h1>Chat Page - Coming Soon</h1>
    </div>
  );
};

export default ChatPage;
EOF

# index.ts
cat > "$BASE_DIR/index.ts" << 'EOF'
/**
 * Chat Page Exports
 */

export { default as ChatPage } from './ChatPage';
export * from './types';
export * from './constants';
EOF

echo -e "${GREEN}✓ Root files created${NC}"
echo ""

# ============================================================================
# Create Component Files - Sidebar
# ============================================================================

echo -e "${YELLOW}Creating sidebar components...${NC}"

cat > "$BASE_DIR/components/sidebar/MinimalSidebar.tsx" << 'EOF'
/**
 * MinimalSidebar - Ultra-thin edge sidebar
 * 40px collapsed, 240px expanded
 */

import React from 'react';

export const MinimalSidebar: React.FC = () => {
  return (
    <aside className="minimal-sidebar">
      {/* Sidebar content */}
    </aside>
  );
};
EOF

cat > "$BASE_DIR/components/sidebar/SidebarToggle.tsx" << 'EOF'
/**
 * SidebarToggle - Hamburger/collapse button
 */

import React from 'react';

export const SidebarToggle: React.FC = () => {
  return (
    <button className="sidebar-toggle">
      {/* Toggle icon */}
    </button>
  );
};
EOF

cat > "$BASE_DIR/components/sidebar/SessionList.tsx" << 'EOF'
/**
 * SessionList - Time-grouped sessions
 * Groups: Today, Yesterday, 7 Days, 30 Days
 */

import React from 'react';

export const SessionList: React.FC = () => {
  return (
    <div className="session-list">
      {/* Session groups */}
    </div>
  );
};
EOF

cat > "$BASE_DIR/components/sidebar/SessionItem.tsx" << 'EOF'
/**
 * SessionItem - Minimal session card
 * Shows title + timestamp
 */

import React from 'react';

export const SessionItem: React.FC = () => {
  return (
    <div className="session-item">
      {/* Session info */}
    </div>
  );
};
EOF

cat > "$BASE_DIR/components/sidebar/UserAvatar.tsx" << 'EOF'
/**
 * UserAvatar - Bottom profile pill
 */

import React from 'react';

export const UserAvatar: React.FC = () => {
  return (
    <div className="user-avatar">
      {/* User info */}
    </div>
  );
};
EOF

echo -e "${GREEN}✓ Sidebar components created${NC}"

# ============================================================================
# Create Component Files - Main Area
# ============================================================================

echo -e "${YELLOW}Creating main area components...${NC}"

cat > "$BASE_DIR/components/main-area/ChatContainer.tsx" << 'EOF'
/**
 * ChatContainer - Centered max-width container
 */

import React from 'react';

export const ChatContainer: React.FC = () => {
  return (
    <div className="chat-container">
      {/* Chat content */}
    </div>
  );
};
EOF

cat > "$BASE_DIR/components/main-area/WelcomeScreen.tsx" << 'EOF'
/**
 * WelcomeScreen - "How can I help you?" with icon
 */

import React from 'react';

export const WelcomeScreen: React.FC = () => {
  return (
    <div className="welcome-screen">
      <h2>How can I help you?</h2>
    </div>
  );
};
EOF

cat > "$BASE_DIR/components/main-area/MessageList.tsx" << 'EOF'
/**
 * MessageList - Scrollable messages
 */

import React from 'react';

export const MessageList: React.FC = () => {
  return (
    <div className="message-list">
      {/* Messages */}
    </div>
  );
};
EOF

cat > "$BASE_DIR/components/main-area/ChatInput.tsx" << 'EOF'
/**
 * ChatInput - Floating glass input at bottom
 */

import React from 'react';

export const ChatInput: React.FC = () => {
  return (
    <div className="chat-input">
      {/* Input field */}
    </div>
  );
};
EOF

echo -e "${GREEN}✓ Main area components created${NC}"

# ============================================================================
# Create Component Files - Messages
# ============================================================================

echo -e "${YELLOW}Creating message components...${NC}"

cat > "$BASE_DIR/components/messages/Message.tsx" << 'EOF'
/**
 * Message - Single message wrapper
 */

import React from 'react';

export const Message: React.FC = () => {
  return (
    <div className="message">
      {/* Message content */}
    </div>
  );
};
EOF

cat > "$BASE_DIR/components/messages/UserMessage.tsx" << 'EOF'
/**
 * UserMessage - User bubble (right-aligned, subtle bg)
 */

import React from 'react';

export const UserMessage: React.FC = () => {
  return (
    <div className="user-message">
      {/* User message */}
    </div>
  );
};
EOF

cat > "$BASE_DIR/components/messages/AssistantMessage.tsx" << 'EOF'
/**
 * AssistantMessage - AI bubble (left-aligned, icon)
 */

import React from 'react';

export const AssistantMessage: React.FC = () => {
  return (
    <div className="assistant-message">
      {/* AI message */}
    </div>
  );
};
EOF

cat > "$BASE_DIR/components/messages/MessageMarkdown.tsx" << 'EOF'
/**
 * MessageMarkdown - Renders markdown + code
 */

import React from 'react';

export const MessageMarkdown: React.FC = () => {
  return (
    <div className="message-markdown">
      {/* Rendered markdown */}
    </div>
  );
};
EOF

cat > "$BASE_DIR/components/messages/CodeBlock.tsx" << 'EOF'
/**
 * CodeBlock - Syntax highlighted code
 */

import React from 'react';

export const CodeBlock: React.FC = () => {
  return (
    <div className="code-block">
      {/* Code with syntax highlighting */}
    </div>
  );
};
EOF

cat > "$BASE_DIR/components/messages/MessageActions.tsx" << 'EOF'
/**
 * MessageActions - Copy, regenerate icons
 */

import React from 'react';

export const MessageActions: React.FC = () => {
  return (
    <div className="message-actions">
      {/* Action buttons */}
    </div>
  );
};
EOF

cat > "$BASE_DIR/components/messages/ThinkingProcess.tsx" << 'EOF'
/**
 * ThinkingProcess - DeepThink collapsible reasoning
 */

import React from 'react';

export const ThinkingProcess: React.FC = () => {
  return (
    <div className="thinking-process">
      {/* Thinking steps */}
    </div>
  );
};
EOF

cat > "$BASE_DIR/components/messages/StreamingText.tsx" << 'EOF'
/**
 * StreamingText - Typewriter effect
 */

import React from 'react';

export const StreamingText: React.FC = () => {
  return (
    <span className="streaming-text">
      {/* Streaming text */}
    </span>
  );
};
EOF

echo -e "${GREEN}✓ Message components created${NC}"

# ============================================================================
# Create Component Files - Input
# ============================================================================

echo -e "${YELLOW}Creating input components...${NC}"

cat > "$BASE_DIR/components/input/MainInput.tsx" << 'EOF'
/**
 * MainInput - Large centered glass input
 */

import React from 'react';

export const MainInput: React.FC = () => {
  return (
    <div className="main-input">
      {/* Input field */}
    </div>
  );
};
EOF

cat > "$BASE_DIR/components/input/ModeToggle.tsx" << 'EOF'
/**
 * ModeToggle - Pills: "DeepThink" | "Search"
 */

import React from 'react';

export const ModeToggle: React.FC = () => {
  return (
    <div className="mode-toggle">
      {/* Mode pills */}
    </div>
  );
};
EOF

cat > "$BASE_DIR/components/input/AttachmentButton.tsx" << 'EOF'
/**
 * AttachmentButton - File upload icon
 */

import React from 'react';

export const AttachmentButton: React.FC = () => {
  return (
    <button className="attachment-button">
      {/* Upload icon */}
    </button>
  );
};
EOF

cat > "$BASE_DIR/components/input/VoiceButton.tsx" << 'EOF'
/**
 * VoiceButton - Microphone icon
 */

import React from 'react';

export const VoiceButton: React.FC = () => {
  return (
    <button className="voice-button">
      {/* Microphone icon */}
    </button>
  );
};
EOF

cat > "$BASE_DIR/components/input/SendButton.tsx" << 'EOF'
/**
 * SendButton - Arrow up circle (primary color)
 */

import React from 'react';

export const SendButton: React.FC = () => {
  return (
    <button className="send-button">
      {/* Send icon */}
    </button>
  );
};
EOF

cat > "$BASE_DIR/components/input/InputActions.tsx" << 'EOF'
/**
 * InputActions - Bottom row of mode toggles
 */

import React from 'react';

export const InputActions: React.FC = () => {
  return (
    <div className="input-actions">
      {/* Action buttons */}
    </div>
  );
};
EOF

echo -e "${GREEN}✓ Input components created${NC}"

# ============================================================================
# Create Component Files - Preview
# ============================================================================

echo -e "${YELLOW}Creating preview components...${NC}"

cat > "$BASE_DIR/components/preview/PreviewSidebar.tsx" << 'EOF'
/**
 * PreviewSidebar - RIGHT edge (300px when active)
 */

import React from 'react';

export const PreviewSidebar: React.FC = () => {
  return (
    <aside className="preview-sidebar">
      {/* File preview */}
    </aside>
  );
};
EOF

cat > "$BASE_DIR/components/preview/FilePreview.tsx" << 'EOF'
/**
 * FilePreview - Shows uploaded file
 */

import React from 'react';

export const FilePreview: React.FC = () => {
  return (
    <div className="file-preview">
      {/* File content */}
    </div>
  );
};
EOF

cat > "$BASE_DIR/components/preview/ImagePreview.tsx" << 'EOF'
/**
 * ImagePreview - Image viewer
 */

import React from 'react';

export const ImagePreview: React.FC = () => {
  return (
    <div className="image-preview">
      {/* Image */}
    </div>
  );
};
EOF

cat > "$BASE_DIR/components/preview/DocumentPreview.tsx" << 'EOF'
/**
 * DocumentPreview - PDF/doc viewer
 */

import React from 'react';

export const DocumentPreview: React.FC = () => {
  return (
    <div className="document-preview">
      {/* Document viewer */}
    </div>
  );
};
EOF

cat > "$BASE_DIR/components/preview/PreviewActions.tsx" << 'EOF'
/**
 * PreviewActions - Remove, download icons
 */

import React from 'react';

export const PreviewActions: React.FC = () => {
  return (
    <div className="preview-actions">
      {/* Action buttons */}
    </div>
  );
};
EOF

echo -e "${GREEN}✓ Preview components created${NC}"

# ============================================================================
# Create Component Files - Header
# ============================================================================

echo -e "${YELLOW}Creating header components...${NC}"

cat > "$BASE_DIR/components/header/TopBar.tsx" << 'EOF'
/**
 * TopBar - Minimal top bar (logo, model selector)
 */

import React from 'react';

export const TopBar: React.FC = () => {
  return (
    <header className="top-bar">
      {/* Header content */}
    </header>
  );
};
EOF

cat > "$BASE_DIR/components/header/ModelSelector.tsx" << 'EOF'
/**
 * ModelSelector - Dropdown for AI models
 */

import React from 'react';

export const ModelSelector: React.FC = () => {
  return (
    <div className="model-selector">
      {/* Model dropdown */}
    </div>
  );
};
EOF

cat > "$BASE_DIR/components/header/SettingsMenu.tsx" << 'EOF'
/**
 * SettingsMenu - User settings dropdown
 */

import React from 'react';

export const SettingsMenu: React.FC = () => {
  return (
    <div className="settings-menu">
      {/* Settings */}
    </div>
  );
};
EOF

echo -e "${GREEN}✓ Header components created${NC}"

# ============================================================================
# Create Component Files - Shared
# ============================================================================

echo -e "${YELLOW}Creating shared components...${NC}"

cat > "$BASE_DIR/components/shared/GlassCard.tsx" << 'EOF'
/**
 * GlassCard - Reusable glass card
 */

import React from 'react';

export const GlassCard: React.FC = () => {
  return (
    <div className="glass-card">
      {/* Card content */}
    </div>
  );
};
EOF

cat > "$BASE_DIR/components/shared/GlassPill.tsx" << 'EOF'
/**
 * GlassPill - Rounded pill buttons (mode toggles)
 */

import React from 'react';

export const GlassPill: React.FC = () => {
  return (
    <button className="glass-pill">
      {/* Pill content */}
    </button>
  );
};
EOF

cat > "$BASE_DIR/components/shared/IconButton.tsx" << 'EOF'
/**
 * IconButton - Circular glass icon buttons
 */

import React from 'react';

export const IconButton: React.FC = () => {
  return (
    <button className="icon-button">
      {/* Icon */}
    </button>
  );
};
EOF

cat > "$BASE_DIR/components/shared/TypingDots.tsx" << 'EOF'
/**
 * TypingDots - Animated typing indicator
 */

import React from 'react';

export const TypingDots: React.FC = () => {
  return (
    <div className="typing-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
  );
};
EOF

cat > "$BASE_DIR/components/shared/ScrollToBottom.tsx" << 'EOF'
/**
 * ScrollToBottom - Floating scroll button
 */

import React from 'react';

export const ScrollToBottom: React.FC = () => {
  return (
    <button className="scroll-to-bottom">
      {/* Scroll icon */}
    </button>
  );
};
EOF

echo -e "${GREEN}✓ Shared components created${NC}"

# ============================================================================
# Create Hook Files
# ============================================================================

echo -e "${YELLOW}Creating hook files...${NC}"

cat > "$BASE_DIR/hooks/useChatSession.ts" << 'EOF'
/**
 * useChatSession - Session CRUD
 */

export const useChatSession = () => {
  // Session management logic
  return {};
};
EOF

cat > "$BASE_DIR/hooks/useChatMessages.ts" << 'EOF'
/**
 * useChatMessages - Message fetching/sending
 */

export const useChatMessages = () => {
  // Message management logic
  return {};
};
EOF

cat > "$BASE_DIR/hooks/useStreamingResponse.ts" << 'EOF'
/**
 * useStreamingResponse - WebSocket streaming
 */

export const useStreamingResponse = () => {
  // Streaming logic
  return {};
};
EOF

cat > "$BASE_DIR/hooks/useFileUpload.ts" << 'EOF'
/**
 * useFileUpload - Handle file attachments
 */

export const useFileUpload = () => {
  // File upload logic
  return {};
};
EOF

cat > "$BASE_DIR/hooks/usePreviewSidebar.ts" << 'EOF'
/**
 * usePreviewSidebar - Right sidebar state
 */

export const usePreviewSidebar = () => {
  // Preview sidebar state
  return {};
};
EOF

cat > "$BASE_DIR/hooks/useSidebarCollapse.ts" << 'EOF'
/**
 * useSidebarCollapse - Left sidebar state
 */

export const useSidebarCollapse = () => {
  // Sidebar collapse state
  return {};
};
EOF

cat > "$BASE_DIR/hooks/useAutoScroll.ts" << 'EOF'
/**
 * useAutoScroll - Smart scroll behavior
 */

export const useAutoScroll = () => {
  // Auto-scroll logic
  return {};
};
EOF

cat > "$BASE_DIR/hooks/useMessageActions.ts" << 'EOF'
/**
 * useMessageActions - Copy, regenerate logic
 */

export const useMessageActions = () => {
  // Message actions logic
  return {};
};
EOF

cat > "$BASE_DIR/hooks/useKeyboardShortcuts.ts" << 'EOF'
/**
 * useKeyboardShortcuts - Cmd+K, Cmd+N, etc.
 */

export const useKeyboardShortcuts = () => {
  // Keyboard shortcuts logic
  return {};
};
EOF

echo -e "${GREEN}✓ Hook files created${NC}"

# ============================================================================
# Create Style Files
# ============================================================================

echo -e "${YELLOW}Creating style files...${NC}"

cat > "$BASE_DIR/styles/glass.css" << 'EOF'
/**
 * Glassmorphism utility classes
 */

.glass-card {
  background: rgba(53, 54, 56, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(86, 133, 254, 0.2);
  border-radius: 16px;
}
EOF

cat > "$BASE_DIR/styles/animations.css" << 'EOF'
/**
 * Smooth transitions and animations
 */

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
EOF

cat > "$BASE_DIR/styles/markdown.css" << 'EOF'
/**
 * Message markdown styling
 */

.message-markdown {
  line-height: 1.6;
}
EOF

cat > "$BASE_DIR/styles/scrollbar.css" << 'EOF'
/**
 * Custom scrollbar
 */

::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(86, 133, 254, 0.3);
  border-radius: 4px;
}
EOF

cat > "$BASE_DIR/styles/deepseek-theme.css" << 'EOF'
/**
 * DeepSeek-inspired theme variables
 */

:root {
  --color-primary: #5685FE;
  --color-dark-bg: #1D1E22;
  --color-medium: #353638;
  --color-darker: #19191C;
}
EOF

echo -e "${GREEN}✓ Style files created${NC}"

# ============================================================================
# Create Util Files
# ============================================================================

echo -e "${YELLOW}Creating util files...${NC}"

cat > "$BASE_DIR/utils/markdown.ts" << 'EOF'
/**
 * Markdown parser utilities
 */

export const parseMarkdown = (text: string): string => {
  return text;
};
EOF

cat > "$BASE_DIR/utils/codeHighlight.ts" << 'EOF'
/**
 * Code syntax highlighting (Prism.js/Shiki)
 */

export const highlightCode = (code: string, language: string): string => {
  return code;
};
EOF

cat > "$BASE_DIR/utils/dateGrouper.ts" << 'EOF'
/**
 * Group sessions by time
 */

export const groupSessionsByDate = (sessions: any[]) => {
  return {
    today: [],
    yesterday: [],
    last7Days: [],
    last30Days: [],
  };
};
EOF

cat > "$BASE_DIR/utils/fileHandler.ts" << 'EOF'
/**
 * File upload/preview utilities
 */

export const validateFile = (file: File): boolean => {
  return true;
};
EOF

cat > "$BASE_DIR/utils/streamParser.ts" << 'EOF'
/**
 * Parse SSE/WebSocket streams
 */

export const parseStreamChunk = (chunk: string): any => {
  return JSON.parse(chunk);
};
EOF

cat > "$BASE_DIR/utils/thinkingParser.ts" << 'EOF'
/**
 * Parse DeepThink reasoning
 */

export const parseThinkingProcess = (data: any): string[] => {
  return [];
};
EOF

echo -e "${GREEN}✓ Util files created${NC}"

# ============================================================================
# Create Type Files
# ============================================================================

echo -e "${YELLOW}Creating type files...${NC}"

cat > "$BASE_DIR/types/chat.types.ts" << 'EOF'
/**
 * Main chat types
 */

export interface ChatSession {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}
EOF

cat > "$BASE_DIR/types/message.types.ts" << 'EOF'
/**
 * Message types
 */

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}
EOF

cat > "$BASE_DIR/types/file.types.ts" << 'EOF'
/**
 * File attachment types
 */

export interface FileAttachment {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
}
EOF

cat > "$BASE_DIR/types/streaming.types.ts" << 'EOF'
/**
 * WebSocket streaming types
 */

export interface StreamMessage {
  type: string;
  data: any;
}
EOF

cat > "$BASE_DIR/types/index.ts" << 'EOF'
/**
 * Type exports
 */

export * from './chat.types';
export * from './message.types';
export * from './file.types';
export * from './streaming.types';
EOF

echo -e "${GREEN}✓ Type files created${NC}"

# ============================================================================
# Create Constants Files
# ============================================================================

echo -e "${YELLOW}Creating constants files...${NC}"

cat > "$BASE_DIR/constants/colors.ts" << 'EOF'
/**
 * Color palette constants
 */

export const COLORS = {
  primary: '#5685FE',
  darkBg: '#1D1E22',
  medium: '#353638',
  darker: '#19191C',
} as const;
EOF

cat > "$BASE_DIR/constants/modelOptions.ts" << 'EOF'
/**
 * Available AI models
 */

export const MODEL_OPTIONS = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Fast and efficient',
  },
];
EOF

cat > "$BASE_DIR/constants/shortcuts.ts" << 'EOF'
/**
 * Keyboard shortcuts
 */

export const SHORTCUTS = {
  NEW_CHAT: 'cmd+n',
  SEARCH: 'cmd+k',
  SEND: 'cmd+enter',
} as const;
EOF

cat > "$BASE_DIR/constants/index.ts" << 'EOF'
/**
 * Constants exports
 */

export * from './colors';
export * from './modelOptions';
export * from './shortcuts';
EOF

echo -e "${GREEN}✓ Constants files created${NC}"

# ============================================================================
# Summary
# ============================================================================

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}✓ Chat structure created successfully!${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${YELLOW}Created:${NC}"
echo "  - 7 component directories with 35 components"
echo "  - 9 custom hooks"
echo "  - 5 CSS files"
echo "  - 6 utility files"
echo "  - 5 type files"
echo "  - 4 constants files"
echo ""
echo -e "${YELLOW}Location:${NC} ${BASE_DIR}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Review the generated structure"
echo "  2. Install dependencies (react-markdown, prismjs, etc.)"
echo "  3. Start implementing component logic"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
