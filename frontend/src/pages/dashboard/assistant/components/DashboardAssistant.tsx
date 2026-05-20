/**
 * DashboardAssistant - Main container component
 * 
 * This is the refactored version of the original 731-line monolith.
 * It now composes focused child components and delegates:
 * - State → assistantStore
 * - API operations → useAssistant hook
 * - UI → child components
 */

import { Bot } from "lucide-react";
import { NeumorphicCard, NeumorphicButton } from "@/components/neumorphic";
import { cn } from "@/lib/utils";
import {
    useAssistantOpen,
    useAssistantMinimized,
    useAssistantSidebar,
    useAssistantActions,
} from "../state";
import { useAssistant } from "../hooks";
import { AssistantHeader } from "./AssistantHeader";
import { AssistantSidebar } from "./AssistantSidebar";
import { AssistantQuickActions } from "./AssistantQuickActions";
import { AssistantMessages } from "./AssistantMessages";
import { AssistantInput } from "./AssistantInput";

interface DashboardAssistantProps {
    className?: string;
}

export function DashboardAssistant({ className }: DashboardAssistantProps) {
    const isOpen = useAssistantOpen();
    const isMinimized = useAssistantMinimized();
    const showSidebar = useAssistantSidebar();
    const { open, restore, close } = useAssistantActions();

    // Initialize assistant (runs session init and history loading)
    useAssistant();

    // Minimized state - FAB only
    if (isMinimized) {
        return (
            <NeumorphicButton
                variant="primary"
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 animate-in fade-in zoom-in p-0 flex items-center justify-center"
                onClick={restore}
            >
                <Bot className="h-6 w-6" />
            </NeumorphicButton>
        );
    }

    // Closed state - FAB only
    if (!isOpen) {
        return (
            <NeumorphicButton
                variant="primary"
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 animate-in fade-in zoom-in p-0 flex items-center justify-center"
                onClick={open}
            >
                <Bot className="h-6 w-6" />
            </NeumorphicButton>
        );
    }

    // Open state - Full widget
    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-background/70 backdrop-blur-[2px] z-40 animate-in fade-in duration-200"
                onClick={close}
            />

            <NeumorphicCard
                className={cn(
                    "fixed bottom-6 right-6 z-50 flex flex-col transition-all duration-300 ease-in-out p-0 border-0 overflow-hidden",
                    "h-[680px] bg-popover backdrop-blur-xl border border-border",
                    "animate-in slide-in-from-bottom-4 fade-in duration-300",
                    showSidebar ? "w-[600px]" : "w-[420px]",
                    className
                )}
            >
                <AssistantHeader />

                <div className="flex flex-1 overflow-hidden">
                    <AssistantSidebar />

                    {/* Main Chat Area */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-popover/50">
                        <AssistantQuickActions />
                        <AssistantMessages />
                        <AssistantInput />
                    </div>
                </div>
            </NeumorphicCard>
        </>
    );
}
