/**
 * AssistantInput - Message input form
 */

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { NeumorphicButton } from "@/components/neumorphic";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
    useAssistantTyping,
    useAssistantInitializing,
    useAssistantSessionId,
} from "../state";
import { useAssistant } from "../hooks";

export function AssistantInput() {
    const [input, setInput] = useState("");
    const isTyping = useAssistantTyping();
    const isInitializing = useAssistantInitializing();
    const sessionId = useAssistantSessionId();
    const { sendMessage } = useAssistant();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            sendMessage(input.trim());
            setInput("");
        }
    };

    return (
        <div className="p-4 bg-[#0a0a0f] border-t border-white/5 relative z-10">
            <form onSubmit={handleSubmit} className="flex gap-2 relative">
                <Input
                    placeholder="Ask about your progress..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="h-11 rounded-xl pl-4 pr-12 bg-white/5 border-white/5 text-white placeholder:text-slate-600 focus-visible:bg-white/10 focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/30 transition-all font-light"
                    disabled={isInitializing}
                />
                <NeumorphicButton
                    type="submit"
                    size="icon"
                    className={cn(
                        "absolute right-1.5 top-1.5 h-8 w-8 rounded-lg transition-all duration-300",
                        input.trim()
                            ? "text-cyan-400 hover:text-cyan-300"
                            : "text-slate-600"
                    )}
                    variant="ghost"
                    disabled={isTyping || isInitializing || !sessionId || !input.trim()}
                >
                    {isTyping ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Send className="h-4 w-4" />
                    )}
                </NeumorphicButton>
            </form>
        </div>
    );
}
