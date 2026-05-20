import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { EntitySearchResult } from "../types";
import {
    Loader2,
    FileText,
    StickyNote,
    Layers,
    BrainCircuit,
    HelpCircle,
    AtSign,
} from "lucide-react";
import type { EntityType } from "@/shared/core/entity";
import { motion } from "framer-motion";

interface EntityPickerProps {
    results: EntitySearchResult[];
    activeIndex: number;
    onSelect: (entity: EntitySearchResult) => void;
    isLoading?: boolean;
    query?: string;
    className?: string;
    style?: React.CSSProperties;
}

const ENTITY_CONFIG: Record<EntityType | string, { icon: React.ReactNode; label: string; color: string }> = {
    document: {
        icon: <FileText className="h-3.5 w-3.5" />,
        label: "Document",
        color: "text-blue-400",
    },
    note: {
        icon: <StickyNote className="h-3.5 w-3.5" />,
        label: "Note",
        color: "text-yellow-400",
    },
    flashcard: {
        icon: <Layers className="h-3.5 w-3.5" />,
        label: "Flashcard",
        color: "text-emerald-400",
    },
    quiz: {
        icon: <HelpCircle className="h-3.5 w-3.5" />,
        label: "Quiz",
        color: "text-violet-400",
    },
    concept: {
        icon: <BrainCircuit className="h-3.5 w-3.5" />,
        label: "Concept",
        color: "text-pink-400",
    },
};

function EntityRow({
    result,
    isActive,
    onSelect,
}: {
    result: EntitySearchResult;
    isActive: boolean;
    onSelect: (r: EntitySearchResult) => void;
}) {
    const config = ENTITY_CONFIG[result.type] ?? ENTITY_CONFIG["document"]!;

    return (
        <li
            role="option"
            aria-selected={isActive}
            className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors",
                isActive
                    ? "bg-primary/10 text-foreground"
                    : "text-foreground/80 hover:bg-muted/60",
            )}
            onMouseDown={(e) => {
                // Use mousedown (not click) so it fires before the textarea blur
                e.preventDefault();
                onSelect(result);
            }}
        >
            {/* Type icon */}
            <span className={cn("flex-shrink-0", config.color)}>{config.icon}</span>

            {/* Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-[13px] font-medium leading-tight">{result.title}</span>
                {result.matchPreview && (
                    <span className="truncate text-[11px] text-muted-foreground leading-tight mt-0.5">
                        {result.matchPreview}
                    </span>
                )}
            </div>

            {/* Type badge */}
            <span
                className={cn(
                    "flex-shrink-0 rounded px-1 py-0.5 text-[9px] uppercase tracking-wider font-semibold",
                    "bg-foreground/5 text-muted-foreground",
                )}
            >
                {config.label}
            </span>
        </li>
    );
}

export function EntityPicker({
    results,
    activeIndex,
    onSelect,
    isLoading = false,
    query = "",
    className,
    style,
}: EntityPickerProps) {
    const listRef = useRef<HTMLUListElement>(null);

    // Auto-scroll active item into view
    useEffect(() => {
        if (listRef.current && results.length > 0) {
            const activeItem = listRef.current.children[activeIndex] as HTMLElement | undefined;
            activeItem?.scrollIntoView({ block: "nearest" });
        }
    }, [activeIndex, results.length]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.13, ease: "easeOut" }}
            className={cn(
                "z-50 w-72 rounded-xl border border-border bg-popover shadow-xl",
                "overflow-hidden",
                className,
            )}
            style={style}
            role="listbox"
            aria-label="Mention entity picker"
        >
            {/* Header */}
            <div className="flex items-center gap-1.5 border-b border-border/50 px-3 py-2">
                <AtSign className="h-3 w-3 text-primary/70" />
                <span className="text-[11px] font-medium text-muted-foreground">
                    {query ? `"${query}"` : "Mention a note, quiz or document"}
                </span>
            </div>

            {/* Body */}
            <div className="max-h-56 overflow-y-auto custom-scrollbar">
                {isLoading ? (
                    <div className="flex items-center gap-2 px-3 py-3 text-[13px] text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Searching…
                    </div>
                ) : !query ? (
                    /* Empty state — no characters typed after @ yet */
                    <div className="flex flex-col items-center gap-1.5 px-4 py-5 text-center">
                        <AtSign className="h-6 w-6 text-muted-foreground/30" />
                        <p className="text-[12px] font-medium text-muted-foreground">
                            Start typing to search
                        </p>
                        <p className="text-[11px] text-muted-foreground/60">
                            notes · quizzes · documents · flashcards
                        </p>
                    </div>
                ) : results.length === 0 ? (
                    <div className="px-3 py-4 text-center text-[12px] text-muted-foreground">
                        No results for <span className="font-medium text-foreground">"{query}"</span>
                    </div>
                ) : (
                    <ul ref={listRef} className="p-1">
                        {results.map((result, index) => (
                            <EntityRow
                                key={`${result.type}:${result.id}`}
                                result={result}
                                isActive={index === activeIndex}
                                onSelect={onSelect}
                            />
                        ))}
                    </ul>
                )}
            </div>

            {/* Footer hint */}
            {results.length > 0 && (
                <div className="border-t border-border/50 px-3 py-1.5 flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground/60">
                        ↑↓ navigate · ↵ select · esc dismiss
                    </span>
                </div>
            )}
        </motion.div>
    );
}
