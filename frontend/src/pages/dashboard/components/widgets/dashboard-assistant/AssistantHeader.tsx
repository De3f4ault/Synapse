/**
 * AssistantHeader - Header component for Dashboard Assistant
 * 
 * Displays branding, connection status, and control buttons.
 * Matches main chat page styling.
 */

import { BrainCircuit, Minimize2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AssistantHeaderProps {
    showSidebar: boolean;
    onToggleSidebar: () => void;
    onClose: () => void;
    isConnected: boolean;
    isInitializing: boolean;
}

export function AssistantHeader({
    showSidebar,
    onToggleSidebar,
    onClose,
    isConnected,
    isInitializing,
}: AssistantHeaderProps) {
    return (
        <div className="bg-card/50 backdrop-blur-sm py-4 px-4 flex flex-row items-center justify-between border-b border-border/50 relative z-20">
            <div className="flex items-center gap-3">
                {/* Sidebar Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    onClick={onToggleSidebar}
                >
                    {showSidebar ? (
                        <ChevronRight className="h-4 w-4" />
                    ) : (
                        <ChevronLeft className="h-4 w-4" />
                    )}
                </Button>

                {/* Logo/Icon - BrainCircuit for Neural Theme */}
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <BrainCircuit className="h-5 w-5 text-primary" />
                </div>

                {/* Title & Status */}
                <div>
                    <h3 className="text-sm font-semibold text-foreground tracking-tight">
                        Synapse Assistant
                    </h3>
                    <div className="flex items-center gap-1.5">
                        <span
                            className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                isInitializing
                                    ? "bg-amber-400 animate-pulse"
                                    : isConnected
                                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                                        : "bg-red-400",
                            )}
                        />
                        <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                            {isInitializing ? "CONNECTING..." : isConnected ? "ONLINE" : "OFFLINE"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Close Button */}
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                onClick={onClose}
            >
                <Minimize2 className="h-4 w-4" />
            </Button>
        </div>
    );
}

export default AssistantHeader;
