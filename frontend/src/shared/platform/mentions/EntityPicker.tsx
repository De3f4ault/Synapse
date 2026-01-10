import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { EntitySearchResult } from "../types";
import { Loader2, FileText, StickyNote, Layers, BrainCircuit, HelpCircle } from "lucide-react";
import type { EntityType } from "@/shared/core/entity";

interface EntityPickerProps {
    results: EntitySearchResult[];
    activeIndex: number;
    onSelect: (entity: EntitySearchResult) => void;
    isLoading?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

const EntityIcon = ({ type }: { type: EntityType }) => {
    switch (type) {
        case "document": return <FileText className="h-4 w-4 text-blue-500" />;
        case "note": return <StickyNote className="h-4 w-4 text-yellow-500" />;
        case "flashcard": return <Layers className="h-4 w-4 text-green-500" />;
        case "quiz": return <HelpCircle className="h-4 w-4 text-purple-500" />;
        case "concept": return <BrainCircuit className="h-4 w-4 text-pink-500" />;
        default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
};

export function EntityPicker({
    results,
    activeIndex,
    onSelect,
    isLoading,
    className,
    style,
}: EntityPickerProps) {
    const listRef = useRef<HTMLUListElement>(null);

    // Auto-scroll to active item
    useEffect(() => {
        if (listRef.current) {
            const activeItem = listRef.current.children[activeIndex] as HTMLElement;
            if (activeItem) {
                activeItem.scrollIntoView({ block: "nearest" });
            }
        }
    }, [activeIndex]);

    if (isLoading) {
        return (
            <div className={cn("p-2 text-sm text-gray-500 flex items-center gap-2", className)} style={style}>
                <Loader2 className="h-3 w-3 animate-spin" />
                Searching...
            </div>
        );
    }

    if (results.length === 0) {
        return (
            <div className={cn("p-2 text-sm text-gray-500 italic", className)} style={style}>
                No results found
            </div>
        );
    }

    return (
        <ul
            ref={listRef}
            className={cn(
                "z-50 w-64 max-h-60 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md",
                className
            )}
            style={style}
            role="listbox"
        >
            {results.map((result, index) => (
                <li
                    key={`${result.type}:${result.id}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
                        index === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                    )}
                    onClick={() => onSelect(result)}
                >
                    <EntityIcon type={result.type} />
                    <div className="flex flex-col overflow-hidden">
                        <span className="truncate font-medium">{result.title}</span>
                        {result.matchPreview && (
                            <span className="truncate text-xs text-muted-foreground">
                                {result.matchPreview}
                            </span>
                        )}
                        <span className="text-[10px] text-muted-foreground uppercase">
                            {result.type} • {result.createdAt ? new Date(result.createdAt).toLocaleDateString() : ""}
                        </span>
                    </div>
                </li>
            ))}
        </ul>
    );
}
