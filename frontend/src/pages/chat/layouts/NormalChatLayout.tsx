import { forwardRef } from 'react';
import { ChatInterface, ChatInterfaceHandle } from '@/modules/chat/components/ChatInterface';
import { ChatHistorySidebar } from '../components/shared/ChatHistorySidebar';
import { ModeSwitcher } from '../components/ModeSwitcher';

interface NormalChatLayoutProps {
    sessionId: number;
    chatRef: React.RefObject<ChatInterfaceHandle>;
    mode: 'normal' | 'study';
    onModeChange: (mode: 'normal' | 'study') => void;
}

export const NormalChatLayout = forwardRef<HTMLDivElement, NormalChatLayoutProps>(
    ({ sessionId, chatRef, mode, onModeChange }, ref) => {
        return (
            <div ref={ref} className="h-screen flex bg-[var(--synapse-bg-primary)] overflow-hidden font-sans">

                {/* Left Sidebar: Session History */}
                <ChatHistorySidebar
                    currentSessionId={sessionId}
                    className="shrink-0 hidden md:flex border-r border-white/5 w-[280px]"
                />

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 relative bg-[#020202]">

                    {/* Top Right Mode Switcher (Anchored) */}
                    <div className="absolute top-4 right-6 z-50">
                        <ModeSwitcher mode={mode} onModeChange={onModeChange} />
                    </div>

                    {/* Chat Interface */}
                    <div className="flex-1 h-full flex flex-col relative">
                        {/*
                           We wrap ChatInterface in a flex container to ensure height is strict.
                           The ChatInterface itself handles the "canvas" feel.
                        */}
                        <ChatInterface
                            ref={chatRef}
                            sessionId={sessionId}
                            className="h-full"
                        />
                    </div>
                </div>
            </div>
        );
    }
);

NormalChatLayout.displayName = 'NormalChatLayout';
