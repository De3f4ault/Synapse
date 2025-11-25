/**
 * ChatPage.tsx
 * ROLE: The Orchestrator
 * RESPONSIBILITY:
 * - Detects Session State (New vs Active)
 * - Renders ChatContainer for messages
 * - SWAPS inputs: MainInput (for new) vs ChatInput (for active)
 */

import React from 'react';
import { useParams } from 'react-router-dom';

// --- Chat Components ---
import { MinimalSidebar } from '@/pages/chat/components/sidebar/MinimalSidebar';
import { ChatContainer } from '@/pages/chat/components/main-area/ChatContainer';
import { ChatInput } from '@/pages/chat/components/main-area/ChatInput'; // Corrected path
import { MainInput } from '@/pages/chat/components/input/MainInput';
import { PreviewSidebar } from '@/pages/chat/components/preview/PreviewSidebar';

// --- Hooks & Utils ---
import { useSidebarCollapse } from '@/pages/chat/hooks/useSidebarCollapse';
import { usePreviewSidebar } from '@/pages/chat/hooks/usePreviewSidebar';
import { cn } from '@/lib/utils';

// --- Styles ---
import '@/pages/chat/styles/scrollbar.css';
import '@/pages/chat/styles/global-overrides.css';

export const ChatPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const { isCollapsed, toggle: toggleSidebar } = useSidebarCollapse();
    const { isOpen: isPreviewOpen } = usePreviewSidebar();

    // Check if there is an active chat session
    const isActiveSession = !!sessionId;

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-[#151517]">
        {/* 1. Left Sidebar - History & Sessions */}
        <MinimalSidebar />

        {/* 2. Top-Left Controls (Fixed position) */}
        <div className="fixed top-4 left-4 z-50 flex items-center gap-2">
        {/* Brand Logo */}
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#5685FE] to-[#4574ed] flex items-center justify-center shadow-lg shadow-blue-900/20">
        <svg
        className="w-5 h-5 text-white"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
        </svg>
        </div>

        {/* Sidebar Toggle */}
        <button
        onClick={toggleSidebar}
        className="w-9 h-9 rounded-lg bg-[#27272a] hover:bg-[#3F3F46] border border-white/5 flex items-center justify-center transition-colors text-zinc-400 hover:text-white"
        title={isCollapsed ? 'Show sidebar' : 'Hide sidebar'}
        >
        <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
        </button>
        </div>

        {/* 3. Main Content Area */}
        <main
        className={cn(
            'h-full w-full relative flex flex-col',
            isCollapsed ? 'ml-0' : 'ml-[240px]',
            isPreviewOpen ? 'mr-[350px]' : 'mr-0',
            'transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)]'
        )}
        >
        {/* Chat Content */}
        <ChatContainer hasMessages={isActiveSession} />

        {/* Conditional Input Rendering */}
        {isActiveSession ? (
            <ChatInput className="w-full max-w-4xl mx-auto" />
        ) : (
            // Centered MainInput for new sessions
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full px-4 z-30 pointer-events-none">
            <div className="pointer-events-auto">
            <MainInput isCentered={true} />
            </div>
            </div>
        )}
        </main>

        {/* 4. Right Sidebar - File/Preview */}
        <PreviewSidebar />
        </div>
    );
};

export default ChatPage;
