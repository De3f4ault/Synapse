/**
 * SuggestionsPanel — AI-suggested classifications
 *
 * Shows AI-recommended correspondent, document type, and tags
 * with one-click accept buttons.
 */

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TagBadge } from "./TagBadge";
import { Sparkles, Check, Loader2 } from "lucide-react";
import type { Correspondent, DocumentType, Tag } from "../../core/types/dms";

interface Suggestion<T> {
  item: T;
  confidence: number; // 0-1
}

interface SuggestionsPanelProps {
  correspondents?: Suggestion<Correspondent>[];
  documentTypes?: Suggestion<DocumentType>[];
  tags?: Suggestion<Tag>[];
  isLoading?: boolean;
  onAcceptCorrespondent?: (id: number) => void;
  onAcceptDocumentType?: (id: number) => void;
  onAcceptTag?: (id: number) => void;
  className?: string;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 80
      ? "text-emerald-400"
      : pct >= 50
        ? "text-amber-400"
        : "text-slate-500";

  return (
    <span className={cn("text-[9px] font-mono", color)}>
      {pct}%
    </span>
  );
}

export function SuggestionsPanel({
  correspondents = [],
  documentTypes = [],
  tags = [],
  isLoading = false,
  onAcceptCorrespondent,
  onAcceptDocumentType,
  onAcceptTag,
  className,
}: SuggestionsPanelProps) {
  const hasSuggestions =
    correspondents.length > 0 || documentTypes.length > 0 || tags.length > 0;

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground py-3", className)}>
        <Loader2 size={14} className="animate-spin" />
        Analyzing document…
      </div>
    );
  }

  if (!hasSuggestions) {
    return (
      <div className={cn("text-xs text-muted-foreground italic py-2", className)}>
        No suggestions available.
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Sparkles size={12} className="text-amber-400" />
        AI Suggestions
      </h4>

      {/* Correspondent suggestions */}
      {correspondents.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
            Correspondent
          </p>
          {correspondents.map(({ item, confidence }) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-1.5 rounded-md hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300">{item.name}</span>
                <ConfidenceBadge confidence={confidence} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAcceptCorrespondent?.(item.id)}
                className="h-5 w-5 p-0 text-emerald-400 hover:text-emerald-300"
              >
                <Check size={12} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Document type suggestions */}
      {documentTypes.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
            Document type
          </p>
          {documentTypes.map(({ item, confidence }) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-1.5 rounded-md hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300">{item.name}</span>
                <ConfidenceBadge confidence={confidence} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAcceptDocumentType?.(item.id)}
                className="h-5 w-5 p-0 text-emerald-400 hover:text-emerald-300"
              >
                <Check size={12} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Tag suggestions */}
      {tags.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
            Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map(({ item, confidence }) => (
              <div key={item.id} className="flex items-center gap-1">
                <TagBadge
                  name={item.name}
                  color={item.color}
                  size="sm"
                  onClick={() => onAcceptTag?.(item.id)}
                />
                <ConfidenceBadge confidence={confidence} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
