/**
 * ChatPage - Dual-Mode Chat Interface
 * 
 * Supports two modes:
 * - Normal Mode: Traditional full-width AI chat
 * - Study Mode: 3-panel NotebookLM-style layout
 *
 * Location: frontend/src/pages/chat/ChatPage.tsx
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChatInterfaceHandle } from '@/modules/chat/components/ChatInterface';
import { NormalChatLayout } from './layouts/NormalChatLayout';
import { StudyChatLayout } from './layouts/StudyChatLayout';
import { useCreateSession } from './hooks/useChatSession';
import { motion, AnimatePresence } from 'framer-motion';

type ChatMode = 'normal' | 'study';

export const ChatPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [searchParams] = useSearchParams();
    const chatRef = useRef<ChatInterfaceHandle>(null);
    const numericSessionId = sessionId ? parseInt(sessionId) : undefined;

    // Session creation hook
    const createSessionMutation = useCreateSession();

    // Check for mode in URL params, otherwise load from localStorage
    const urlMode = searchParams.get('mode') as ChatMode | null;

    const [chatMode, setChatMode] = useState<ChatMode>(() => {
        if (urlMode === 'normal' || urlMode === 'study') return urlMode;
        const saved = localStorage.getItem('synapse-chat-mode');
        return (saved as ChatMode) || 'normal';
    });

    // Persist mode changes to localStorage
    useEffect(() => {
        localStorage.setItem('synapse-chat-mode', chatMode);
    }, [chatMode]);

    // Keyboard shortcut for mode switching (⌘M / Ctrl+M)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'm' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setChatMode(prev => prev === 'normal' ? 'study' : 'normal');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Redirect to a session if none exists
    useEffect(() => {
        if (!sessionId) {
            // For now, just show empty state or create new session
            // You could auto-create a session here
        }
    }, [sessionId]);

    // Handle new chat creation
    const handleNewChat = () => {
        createSessionMutation.mutate({
            title: 'New Conversation',
        });
    };

    if (!numericSessionId) {
        return (
            <div className="h-screen flex items-center justify-center bg-[var(--synapse-bg-primary)]">
                <div className="text-center space-y-4">
                    <h2 className="text-2xl font-bold text-white">No Active Session</h2>
                    <p className="text-slate-400">Create a new chat session to get started</p>
                    <button
                        onClick={handleNewChat}
                        disabled={createSessionMutation.isPending}
                        className="synapse-button synapse-button-primary"
                    >
                        {createSessionMutation.isPending ? 'Creating...' : 'New Chat'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <AnimatePresence mode="wait">
                <motion.div
                    key={chatMode}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="h-screen"
                >
                    {chatMode === 'normal' ? (
                        <NormalChatLayout
                            sessionId={numericSessionId}
                            chatRef={chatRef}
                            mode={chatMode}
                            onModeChange={setChatMode}
                        />
                    ) : (
                        <StudyChatLayout
                            sessionId={numericSessionId}
                            chatRef={chatRef}
                            mode={chatMode}
                            onModeChange={setChatMode}
                        />
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Mode Switcher moved into layouts for better positioning */}

        </>
    );
};

export default ChatPage;
