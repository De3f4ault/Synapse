/**
 * AssistantQuickActions - Quick action buttons bar
 */

import { Zap, Target, Lightbulb } from "lucide-react";
import { NeumorphicButton } from "@/components/neumorphic";
import { useAssistantTyping, useAssistantInitializing } from "../state";
import { useAssistant } from "../hooks";

const QUICK_ACTIONS = [
    {
        icon: Zap,
        label: "Flashcards",
        prompt: "Create flashcards for my weak areas",
    },
    {
        icon: Target,
        label: "Weak Areas",
        prompt: "What are my weak areas?",
    },
    {
        icon: Lightbulb,
        label: "Tips",
        prompt: "Suggest topics to study next",
    },
];

export function AssistantQuickActions() {
    const isTyping = useAssistantTyping();
    const isInitializing = useAssistantInitializing();
    const { sendMessage } = useAssistant();

    return (
        <div className="px-3 py-3 border-b border-border flex gap-2 overflow-x-auto scrollbar-hide">
            {QUICK_ACTIONS.map((action, i) => (
                <NeumorphicButton
                    key={i}
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-3 shrink-0 whitespace-nowrap"
                    onClick={() => sendMessage(action.prompt)}
                    disabled={isTyping || isInitializing}
                >
                    <action.icon className="h-3 w-3 mr-1.5 text-primary" />
                    {action.label}
                </NeumorphicButton>
            ))}
        </div>
    );
}
