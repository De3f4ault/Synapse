/**
 * ChatProviders - Cross-Cutting Providers
 *
 * INVARIANT:
 * Providers expose context, but modules decide behavior.
 * No business logic here — just wiring.
 *
 * CONTRACT: Session Boundary Orchestration
 * When sessionId changes, all modules reset via their `resetForSession` action.
 * This is the ONLY place cross-module coordination for session changes happens.
 */

import React, { useEffect } from 'react';
import { useChatStore } from './core/state/chatStore';
import { useSearchStore } from './search/state/searchStore';
import { useVoiceStore } from './voice/state/voiceStore';

interface ChatProvidersProps {
    sessionId?: number;
    children: React.ReactNode;
}

/**
 * ChatProviders wraps the chat module with necessary context.
 *
 * Session Boundary Contract:
 * - Calls resetForSession on all stores when sessionId changes
 * - Each store's resetForSession is idempotent
 */
export function ChatProviders({ sessionId, children }: ChatProvidersProps) {
    // Session boundary orchestration (Contract #1)
    useEffect(() => {
        if (sessionId) {
            // Use getState() for stable references (avoids infinite loops)
            useChatStore.getState().resetForSession(sessionId);
            useSearchStore.getState().resetForSession(sessionId);
            useVoiceStore.getState().resetForSession(sessionId);
        }
    }, [sessionId]);

    return (
        <>
            {children}
        </>
    );
}

export default ChatProviders;
