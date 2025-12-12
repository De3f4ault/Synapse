import { forwardRef } from 'react';
import { Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatInterface, ChatInterfaceHandle } from '@/modules/chat/components/ChatInterface';
import { ChatHistorySidebar } from '../components/shared/ChatHistorySidebar';
import { ModeSwitcher } from '../components/ModeSwitcher';
import { useSidebarCollapse } from '../hooks/useSidebarCollapse';
import { cn } from '@/lib/utils';

interface NormalChatLayoutProps {
    sessionId: number;
    chatRef: React.RefObject<ChatInterfaceHandle>;
    mode: 'normal' | 'study';
    onModeChange: (mode: 'normal' | 'study') => void;
}

export const NormalChatLayout = forwardRef<HTMLDivElement, NormalChatLayoutProps>(
    ({ sessionId, chatRef, mode, onModeChange }, ref) => {
        const { isCollapsed, toggleSidebar } = useSidebarCollapse();

        return (
            <div ref={ref} className="h-screen flex bg-[var(--synapse-bg-primary)] overflow-hidden font-sans">

                {/* Retractable Sidebar */}
                <AnimatePresence mode="wait">
                    {!isCollapsed && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 280, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                            className="shrink-0 overflow-hidden"
                        >
                            <ChatHistorySidebar
                                currentSessionId={sessionId}
                                className="w-[280px] h-full border-r border-white/5"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 relative bg-[#020202]">

                    {/* Hamburger Menu Button (Top-Left) */}
                    <button
                        onClick={toggleSidebar}
                        className={cn(
                            "absolute top-4 left-4 z-50 p-2.5 rounded-lg",
                            "bg-black/20 border border-white/10 hover:bg-black/40 hover:border-white/20",
                            "text-[var(--synapse-text-secondary)] hover:text-white",
                            "transition-all duration-300 backdrop-blur-sm"
                        )}
                        aria-label="Toggle sidebar"
                    >
                        <Menu className="h-5 w-5" />
                    </button>

                    {/* Top Right Mode Switcher (Minimal) */}
                    <div className="absolute top-4 right-6 z-50">
                        <ModeSwitcher mode={mode} onModeChange={onModeChange} />
                    </div>

                    {/* Chat Interface */}
                    <div className="flex-1 h-full flex flex-col relative">
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
