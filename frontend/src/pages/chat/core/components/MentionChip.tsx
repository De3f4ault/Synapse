import { cn } from "@/lib/utils";
import type { EntityType } from "@/shared/core/entity";
import { FileText, StickyNote, Layers, BrainCircuit, HelpCircle } from "lucide-react";

interface MentionChipProps {
    title: string;
    type: EntityType;
    id: string;
    className?: string;
}

const EntityIcon = ({ type }: { type: EntityType }) => {
    switch (type) {
        case "document": return <FileText className="h-3 w-3" />;
        case "note": return <StickyNote className="h-3 w-3" />;
        case "flashcard": return <Layers className="h-3 w-3" />;
        case "quiz": return <HelpCircle className="h-3 w-3" />;
        case "concept": return <BrainCircuit className="h-3 w-3" />;
        default: return <FileText className="h-3 w-3" />;
    }
};

export function MentionChip({ title, type, id, className }: MentionChipProps) {
    // We can use context to show details on hover/click?
    // For now just valid visual token

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium cursor-pointer hover:bg-primary/20 transition-colors align-middle mx-0.5 select-none",
                className
            )}
            title={`${type}:${id}`}
        >
            <EntityIcon type={type} />
            {title}
        </span>
    );
}
