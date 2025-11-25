/**
 * ChatPage.tsx - Fully Integrated
 * Complete WebSocket integration with optimistic updates
 */

import React from 'react';
import { useParams } from 'react-router-dom';

// Components
import { MinimalSidebar } from '@/pages/chat/components/sidebar/MinimalSidebar';
import { ChatContainer } from '@/pages/chat/components/main-area/ChatContainer';
import { ChatInput } from '@/pages/chat/components/main-area/ChatInput';
import { MainInput } from '@/pages/chat/components/input/MainInput';
import { PreviewSidebar } from '@/pages/chat/components/preview/PreviewSidebar';

// Hooks
import { useSidebarCollapse } from '@/pages/chat/hooks/useSidebarCollapse';
import { usePreviewSidebar } from '@/pages/chat/hooks/usePreviewSidebar';
import { useChatSession } from '@/pages/chat/hooks/useChatSession';
import { cn } from '@/lib/utils';

// Styles
import '@/pages/chat/styles/scrollbar.css';
import '@/pages/chat/styles/global-overrides.css';

export const ChatPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const { isCollapsed, toggle: toggleSidebar } = useSidebarCollapse();
    const { isOpen: isPreviewOpen } = usePreviewSidebar();

    // Fetch session data
    const { data: session } = useChatSession(sessionId ? parseInt(sessionId) : undefined);
    const isActiveSession = !!sessionId;

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-[#151517]">
        {/* Left Sidebar */}
        <MinimalSidebar />

        {/* Top-Left Branding - Fixed */}
        <div className="fixed top-4 left-4 z-50 flex items-center gap-3">
        {/* Synapse Logo */}
        <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#5685FE] to-[#4574ed] flex items-center justify-center shadow-lg shadow-blue-500/20">
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
        <span className="text-lg font-semibold text-white">Synapse</span>
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

        {/* Main Content */}
        <main
        className={cn(
            'h-full w-full relative',
            isCollapsed ? 'ml-0' : 'ml-[240px]',
            isPreviewOpen ? 'mr-[350px]' : 'mr-0',
            'transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)]'
        )}
        >
        {isActiveSession ? (
            // Active session layout
            <div className="h-full flex flex-col">
            <ChatContainer hasMessages={true} />
            <ChatInput
            className="w-full max-w-4xl mx-auto"
            sessionId={sessionId ? parseInt(sessionId) : undefined}
            />
            </div>
        ) : (
            // New session layout
            <div className="h-full flex flex-col items-center justify-center px-4">
            <div className="flex-1 flex items-center justify-center max-h-[45vh]">
            <ChatContainer hasMessages={false} />
            </div>
            <div className="w-full max-w-[760px] pb-[10vh]">
            <MainInput isCentered={true} />
            </div>
            </div>
        )}
        </main>

        {/* Right Sidebar */}
        <PreviewSidebar />
        </div>
    );
};

export default ChatPage;
