/**
 * SavedViewWidget — Dashboard summary widget for a saved view
 *
 * Shows view name, filter count, and a summary of recent documents.
 * Click → navigates to full filtered document list.
 */

import { cn } from "@/lib/utils";
import { GlassCard } from "@/shared/ui";
import { FileStack, ArrowRight, Filter } from "lucide-react";
import type { SavedView } from "../../core/types/dms";

interface SavedViewWidgetProps {
  view: SavedView;
  /** Count of documents matching this view */
  documentCount?: number;
  /** Recent document titles */
  recentTitles?: string[];
  /** Navigate to full view */
  onClick: (view: SavedView) => void;
  className?: string;
}

export function SavedViewWidget({
  view,
  documentCount = 0,
  recentTitles = [],
  onClick,
  className,
}: SavedViewWidgetProps) {
  return (
    <GlassCard
      className={cn(
        "p-4 cursor-pointer group",
        "hover:border-primary/30 transition-all",
        className
      )}
      hover
      onClick={() => onClick(view)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary">
            <FileStack size={16} />
          </div>
          <h3 className="text-sm font-semibold text-foreground/70 group-hover:text-primary transition-colors truncate">
            {view.name}
          </h3>
        </div>
        <ArrowRight
          size={14}
          className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 mb-3 text-xs">
        <span className="text-muted-foreground">
          <span className="text-lg font-bold text-foreground/70">
            {documentCount}
          </span>{" "}
          documents
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Filter size={10} />
          {view.filter_rules.length} filters
        </span>
      </div>

      {/* Recent documents preview */}
      {recentTitles.length > 0 && (
        <div className="space-y-1 border-t border-border pt-2">
          {recentTitles.slice(0, 5).map((title, i) => (
            <p
              key={i}
              className="text-xs text-muted-foreground truncate"
            >
              {title}
            </p>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
