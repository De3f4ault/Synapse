/**
 * RAGCitationPill — Hoverable inline citation pill for RAG search results.
 *
 * Renders a small numbered badge (e.g. "📝 1") inline with text.
 * On hover, shows a HoverCard with source title, module label, and the
 * exact retrieved chunk excerpt — NotebookLM-style.
 *
 * Uses the installed ai-elements InlineCitation primitives for the hover card
 * body, but replaces InlineCitationCardTrigger (which calls new URL()) with
 * a custom trigger badge that handles non-URL sources like notes/flashcards.
 */

import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────────

export interface RAGCitation {
  id: string;       // "1", "2", "3" — matches [1] in LLM text
  title: string;    // source title (note title, deck name, etc.)
  label: string;    // display label: "📝 Notes · Chapter 3"
  module: "notes" | "flashcards" | "documents";
  excerpt: string;  // retrieved chunk text shown as the quote
}

// ── Module icon map ─────────────────────────────────────────────────────────

const MODULE_ICON: Record<string, string> = {
  notes: "📝",
  flashcards: "🃏",
  documents: "📄",
};

// ── Component ───────────────────────────────────────────────────────────────

interface RAGCitationPillProps {
  citation: RAGCitation;
  className?: string;
}

export function RAGCitationPill({ citation, className }: RAGCitationPillProps) {
  const icon = MODULE_ICON[citation.module] || "📎";

  return (
    <span className={cn("inline-block align-baseline", className)}>
      <HoverCard openDelay={100} closeDelay={50}>
        <HoverCardTrigger asChild>
          <Badge
            variant="secondary"
            className={cn(
              "ml-0.5 rounded-full cursor-pointer text-[10px] font-semibold",
              "px-1.5 py-0 h-[18px] leading-none",
              "bg-primary/10 text-primary border border-primary/20",
              "hover:bg-primary/20 hover:border-primary/35",
              "transition-all duration-150",
              "align-super -translate-y-[1px]"
            )}
          >
            {icon} {citation.id}
          </Badge>
        </HoverCardTrigger>

        <HoverCardContent
          side="top"
          align="center"
          className="w-80 p-0 shadow-xl shadow-black/40"
        >
          {/* Header with module label */}
          <div className="flex items-center gap-2 rounded-t-md bg-secondary px-3 py-2">
            <span className="text-sm">{icon}</span>
            <span className="text-xs font-medium text-foreground/80 truncate flex-1">
              {citation.label}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
              [{citation.id}]
            </span>
          </div>

          {/* Body with title + excerpt */}
          <div className="p-3 space-y-2">
            <h4 className="text-sm font-medium text-foreground leading-snug line-clamp-2">
              {citation.title}
            </h4>

            {citation.excerpt && (
              <blockquote className="border-l-2 border-muted pl-3 text-xs text-muted-foreground italic leading-relaxed line-clamp-4">
                {citation.excerpt}
              </blockquote>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    </span>
  );
}

export default RAGCitationPill;
