/**
 * Action Result Card - Display AI function call results
 *
 * Shows what the AI created/modified with visual cards
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    BookOpen,
    FileText,
    ClipboardList,
    CheckCircle,
    Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionData {
    type: string;
    data: Record<string, any>;
    message: string;
}

interface ActionResultCardProps {
    action: ActionData;
    className?: string;
}

export const ActionResultCard: React.FC<ActionResultCardProps> = ({
    action,
    className,
}) => {
    const getActionIcon = () => {
        switch (action.type) {
            case "create_flashcard":
                return BookOpen;
            case "create_note":
                return FileText;
            case "create_quiz":
                return ClipboardList;
            case "update_flashcard":
            case "update_note":
                return Layers;
            default:
                return CheckCircle;
        }
    };

    const getActionColor = () => {
        switch (action.type) {
            case "create_flashcard":
            case "update_flashcard":
                return "border-l-primary";
            case "create_note":
            case "update_note":
                return "border-l-warning";
            case "create_quiz":
                return "border-l-accent-olive";
            default:
                return "border-l-primary";
        }
    };

    const getActionTitle = () => {
        switch (action.type) {
            case "create_flashcard":
                return "Flashcard Created";
            case "create_note":
                return "Note Created";
            case "create_quiz":
                return "Quiz Created";
            case "update_flashcard":
                return "Flashcard Updated";
            case "update_note":
                return "Note Updated";
            default:
                return "Action Completed";
        }
    };

    const Icon = getActionIcon();

    return (
        <Card
            className={cn(
                "border-l-4",
                getActionColor(),
                "bg-muted/30 hover:bg-muted/50 transition-colors",
                className,
            )}
        >
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                        <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <CardTitle className="text-sm font-semibold">
                        {getActionTitle()}
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                {/* Flashcard Display */}
                {(action.type === "create_flashcard" ||
                    action.type === "update_flashcard") && (
                        <div className="space-y-1 text-sm">
                            <div className="flex items-start gap-2">
                                <span className="font-medium text-muted-foreground min-w-[60px]">
                                    Front:
                                </span>
                                <span className="text-foreground">{action.data.front_text}</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="font-medium text-muted-foreground min-w-[60px]">
                                    Back:
                                </span>
                                <span className="text-foreground">{action.data.back_text}</span>
                            </div>
                            {action.data.card_id && (
                                <div className="text-xs text-muted-foreground mt-2">
                                    ID: {action.data.card_id}
                                </div>
                            )}
                        </div>
                    )}

                {/* Note Display */}
                {(action.type === "create_note" || action.type === "update_note") && (
                    <div className="space-y-1 text-sm">
                        <div className="font-medium text-foreground">
                            {action.data.title}
                        </div>
                        {action.data.note_id && (
                            <div className="text-xs text-muted-foreground">
                                Note ID: {action.data.note_id}
                            </div>
                        )}
                    </div>
                )}

                {/* Quiz Display */}
                {action.type === "create_quiz" && (
                    <div className="space-y-1 text-sm">
                        <div className="font-medium text-foreground">
                            {action.data.title || "New Quiz"}
                        </div>
                        {action.data.question_count && (
                            <div className="text-xs text-muted-foreground">
                                {action.data.question_count} questions
                            </div>
                        )}
                    </div>
                )}

                {/* Success Message */}
                {action.message && (
                    <div className="text-xs text-green-600 dark:text-accent-olive mt-2 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>{action.message}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

/**
 * Actions List Component - Display multiple actions
 */
interface ActionsListProps {
    actions: ActionData[];
    className?: string;
}

export const ActionsList: React.FC<ActionsListProps> = ({
    actions,
    className,
}) => {
    if (!actions || actions.length === 0) return null;

    return (
        <div className={cn("space-y-2 mt-3", className)}>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Actions Taken ({actions.length})
            </div>
            <div className="space-y-2">
                {actions.map((action, index) => (
                    <ActionResultCard key={index} action={action} />
                ))}
            </div>
        </div>
    );
};
