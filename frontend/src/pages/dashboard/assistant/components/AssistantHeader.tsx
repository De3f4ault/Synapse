/**
 * AssistantHeader - Top bar of the assistant widget
 */

import { Bot, Minimize2, ChevronLeft, ChevronRight } from "lucide-react";
import { NeumorphicButton } from "@/components/neumorphic";
import { cn } from "@/lib/utils";
import {
    useAssistantSidebar,
    useAssistantInitializing,
    useAssistantActions,
} from "../state";

export function AssistantHeader() {
    const showSidebar = useAssistantSidebar();
    const isInitializing = useAssistantInitializing();
    const { toggleSidebar, close } = useAssistantActions();

    return (
        <div className="bg-gradient-to-r from-accent/10 via-cyan-500/5 to-transparent py-4 px-4 flex flex-row items-center justify-between border-b border-border">
            <div className="flex items-center gap-3">
                <NeumorphicButton
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={toggleSidebar}
                >
                    {showSidebar ? (
                        <ChevronRight className="h-4 w-4" />
                    ) : (
                        <ChevronLeft className="h-4 w-4" />
                    )}
                </NeumorphicButton>
                <div className="w-8 h-8 rounded-lg bg-muted border border-border rounded-lg flex items-center justify-center text-primary">
                    <Bot className="h-4 w-4" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-foreground tracking-tight">
                        Synapse Assistant
                    </h3>
                    <div className="flex items-center gap-1.5">
                        <span
                            className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                isInitializing
                                    ? "bg-amber-400 animate-pulse"
                                    : "bg-accent-olive shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                            )}
                        />
                        <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                            {isInitializing ? "INITIALIZING..." : "ONLINE"}
                        </span>
                    </div>
                </div>
            </div>
            <NeumorphicButton
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:text-foreground"
                onClick={close}
            >
                <Minimize2 className="h-4 w-4" />
            </NeumorphicButton>
        </div>
    );
}
