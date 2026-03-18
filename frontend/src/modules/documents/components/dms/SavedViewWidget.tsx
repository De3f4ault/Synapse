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
        "hover:border-cyan-500/30 transition-all",
        className
      )}
      hover
      onClick={() => onClick(view)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400">
            <FileStack size={16} />
          </div>
          <h3 className="text-sm font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors truncate">
            {view.name}
          </h3>
        </div>
        <ArrowRight
          size={14}
          className="text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 mb-3 text-xs">
        <span className="text-slate-400">
          <span className="text-lg font-bold text-slate-200">
            {documentCount}
          </span>{" "}
          documents
        </span>
        <span className="flex items-center gap-1 text-slate-500">
          <Filter size={10} />
          {view.filter_rules.length} filters
        </span>
      </div>

      {/* Recent documents preview */}
      {recentTitles.length > 0 && (
        <div className="space-y-1 border-t border-white/5 pt-2">
          {recentTitles.slice(0, 5).map((title, i) => (
            <p
              key={i}
              className="text-xs text-slate-500 truncate"
            >
              {title}
            </p>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
