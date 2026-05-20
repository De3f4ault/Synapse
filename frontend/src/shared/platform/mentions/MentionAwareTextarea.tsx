/**
 * MentionAwareTextarea
 *
 * Renders a textarea whose `@[Title](entity:type:id)` mention syntax is
 * displayed as styled inline chips while the user is composing.
 *
 * TECHNIQUE: transparent textarea + absolutely-positioned overlay div.
 *  - The <textarea> holds the raw value and handles all keyboard/caret events.
 *  - Its text color is set to `transparent` so the actual characters are
 *    invisible, but the caret and selection still render (via caret-color).
 *  - The overlay div is pinned to the same bounding box with pointer-events:none.
 *    It re-renders the same text, replacing mention tokens with <MentionChip>
 *    spans so they appear inline.
 *  - Scroll position is kept in sync so the overlay never drifts.
 *
 * INVARIANT: The raw value (with markup) is always what onChange receives.
 *            Only the visual presentation changes.
 */

import React, { useRef, useCallback, forwardRef } from "react";
import { cn } from "@/lib/utils";
import {
    FileText,
    StickyNote,
    Layers,
    HelpCircle,
    BrainCircuit,
} from "lucide-react";

// ── Mention token regex ──────────────────────────────────────────────────────
const MENTION_RE = /@\[([^\]]+)\]\(entity:([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+)\)/g;

// ── Type → visual config ─────────────────────────────────────────────────────
type EntityType = "note" | "document" | "flashcard" | "quiz" | "concept" | string;

const TYPE_ICONS: Record<string, React.ReactNode> = {
    note: <StickyNote className="h-3 w-3 flex-shrink-0" />,
    document: <FileText className="h-3 w-3 flex-shrink-0" />,
    flashcard: <Layers className="h-3 w-3 flex-shrink-0" />,
    quiz: <HelpCircle className="h-3 w-3 flex-shrink-0" />,
    concept: <BrainCircuit className="h-3 w-3 flex-shrink-0" />,
};

const FALLBACK_ICON = <FileText className="h-3 w-3 flex-shrink-0" />;

// ── Inline chip rendered in the overlay ──────────────────────────────────────
function InlineChip({ title, type }: { title: string; type: string }) {
    const icon = TYPE_ICONS[type] ?? FALLBACK_ICON;
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5",
                "text-[12px] font-medium leading-none",
                "align-middle mx-0.5 select-none",
                "bg-primary/10 text-primary",
            )}
            aria-label={`Mention: ${title}`}
        >
            {icon}
            {title}
        </span>
    );
}

// ── Parse raw text → React nodes ─────────────────────────────────────────────
function parseToNodes(text: string): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;

    MENTION_RE.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = MENTION_RE.exec(text)) !== null) {
        // Plain text before this mention
        if (match.index > lastIndex) {
            nodes.push(text.slice(lastIndex, match.index));
        }
        const [, title, type] = match;
        nodes.push(
            <InlineChip key={`${match.index}-${title}`} title={title!} type={type!} />,
        );
        lastIndex = match.index + match[0].length;
    }

    // Remaining plain text
    if (lastIndex < text.length) {
        nodes.push(text.slice(lastIndex));
    }

    // Always add a trailing non-breaking space so the overlay never collapses
    // shorter than the textarea (prevents vertical misalignment on last line).
    nodes.push("\u00a0");

    return nodes;
}

// ── Main component ───────────────────────────────────────────────────────────
export interface MentionAwareTextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    /** Extra class applied to the outer wrapper div */
    wrapperClassName?: string;
}

export const MentionAwareTextarea = forwardRef<
    HTMLTextAreaElement,
    MentionAwareTextareaProps
>(function MentionAwareTextarea(
    { className, wrapperClassName, value, onScroll, style, ...props },
    ref,
) {
    const overlayRef = useRef<HTMLDivElement>(null);

    // Sync overlay scroll with textarea so chips never drift off-screen
    const handleScroll = useCallback(
        (e: React.UIEvent<HTMLTextAreaElement>) => {
            if (overlayRef.current) {
                overlayRef.current.scrollTop = e.currentTarget.scrollTop;
                overlayRef.current.scrollLeft = e.currentTarget.scrollLeft;
            }
            onScroll?.(e);
        },
        [onScroll],
    );

    const text = typeof value === "string" ? value : String(value ?? "");
    const nodes = parseToNodes(text);

    return (
        <div className={cn("relative w-full", wrapperClassName)}>
            {/*
             * Overlay — positioned over the textarea.
             * pointer-events:none ensures clicks/taps still reach the textarea.
             * overflow:hidden hides any overflow caused by chip height variance.
             */}
            <div
                ref={overlayRef}
                aria-hidden="true"
                className={cn(
                    "pointer-events-none absolute inset-0 z-[1]",
                    "overflow-hidden",
                    // Typography must exactly mirror the <textarea>
                    "text-[15px] leading-relaxed",
                    "text-foreground",
                    // Wrap behaviour must match textarea
                    "whitespace-pre-wrap break-words",
                    // Padding must mirror textarea padding (p-0 here; container adds padding)
                    "p-0",
                )}
                style={{
                    fontFamily: "inherit",
                    letterSpacing: "inherit",
                    wordSpacing: "inherit",
                    fontWeight: "inherit",
                    // Overlay must not be taller than the textarea to avoid gap
                    minHeight: "24px",
                    maxHeight: "200px",
                }}
            >
                {nodes}
            </div>

            {/*
             * Actual <textarea> — holds the raw value and handles all events.
             * Text color is transparent so the overlay shows through.
             * caret-color keeps the cursor visible.
             * selection::bg gives a visible selection highlight.
             */}
            <textarea
                ref={ref}
                value={value}
                onScroll={handleScroll}
                className={cn(
                    className,
                    // Z-index above overlay so cursor/selection work correctly
                    "relative z-[2]",
                    // Transparent text — overlay renders the visible content
                    "text-transparent caret-foreground",
                    // Preserve visible selection highlight
                    "selection:bg-primary/30",
                    "m-0"
                )}
                style={{
                    ...style,
                    fontFamily: "inherit",
                    letterSpacing: "inherit",
                    wordSpacing: "inherit",
                    fontWeight: "inherit",
                }}
                {...props}
            />
        </div>
    );
});

MentionAwareTextarea.displayName = "MentionAwareTextarea";
