/**
 * ChatLayout - Visual Composition ONLY
 *
 * INVARIANT:
 * No hooks. No state. No conditions.
 * Pure layout composition to prevent layout logic leaking into ChatPage.
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface ChatLayoutProps {
    sidebar: React.ReactNode;
    main: React.ReactNode;
    overlay?: React.ReactNode;
    className?: string;
}

export function ChatLayout({ sidebar, main, overlay, className }: ChatLayoutProps) {
    return (
        <div
            className={cn(
                'flex h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950',
                className
            )}
        >
            {/* Sidebar */}
            <aside className="w-72 shrink-0 border-r border-border">
                {sidebar}
            </aside>

            {/* Main content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {main}
            </main>

            {/* Overlay (voice mode, etc.) */}
            {overlay}
        </div>
    );
}

export default ChatLayout;
