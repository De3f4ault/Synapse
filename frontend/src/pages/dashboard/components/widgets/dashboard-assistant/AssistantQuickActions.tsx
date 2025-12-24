/**
 * AssistantQuickActions - Quick action buttons
 * 
 * Smart action bar with common prompts.
 * Matches main chat page styling.
 */

import { Zap, Target, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickAction {
    icon: typeof Zap;
    label: string;
    prompt: string;
}

const DEFAULT_ACTIONS: QuickAction[] = [
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
        label: "Study Tips",
        prompt: "Suggest topics to study next",
    },
];

interface AssistantQuickActionsProps {
    onAction: (prompt: string) => void;
    disabled?: boolean;
    actions?: QuickAction[];
    className?: string;
}

export function AssistantQuickActions({
    onAction,
    disabled = false,
    actions = DEFAULT_ACTIONS,
    className,
}: AssistantQuickActionsProps) {
    return (
        <div className={cn("px-3 py-3 border-b border-border/50 flex gap-2 overflow-x-auto", className)}>
            {actions.map((action, i) => (
                <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-3 shrink-0 whitespace-nowrap gap-1.5"
                    onClick={() => onAction(action.prompt)}
                    disabled={disabled}
                >
                    <action.icon className="h-3 w-3 text-primary" />
                    {action.label}
                </Button>
            ))}
        </div>
    );
}

export default AssistantQuickActions;
