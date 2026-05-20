/**
 * SavedViewSidebar — Sidebar listing of saved views with document counts
 *
 * Shows views where show_in_sidebar=true.
 * Click to activate view, visual indicator for active view.
 */

import { cn } from "@/lib/utils";
import { FileStack, Star } from "lucide-react";
import type { SavedView, ListViewState } from "../../core/types/dms";

interface SavedViewSidebarProps {
  views: SavedView[];
  activeViewId?: number | null;
  onViewClick: (view: SavedView) => void;
  /** Current view state to detect modifications */
  currentState?: ListViewState;
  className?: string;
}

export function SavedViewSidebar({
  views,
  activeViewId,
  onViewClick,
  className,
}: SavedViewSidebarProps) {
  // Only show views marked for sidebar
  const sidebarViews = views.filter((v) => v.show_in_sidebar);

  if (sidebarViews.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-1", className)}>
      <h3 className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Saved Views
      </h3>

      {sidebarViews.map((view) => {
        const isActive = activeViewId === view.id;

        return (
          <button
            key={view.id}
            onClick={() => onViewClick(view)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-all",
              "hover:bg-white/[0.05]",
              isActive
                ? "bg-primary/10 text-primary/80 border-l-2 border-primary"
                : "text-muted-foreground hover:text-foreground/70"
            )}
          >
            {view.show_on_dashboard ? (
              <Star size={14} className={isActive ? "text-primary" : "text-muted-foreground"} />
            ) : (
              <FileStack size={14} className={isActive ? "text-primary" : "text-muted-foreground"} />
            )}

            <span className="flex-1 text-sm truncate">{view.name}</span>

            {/* Document count would come from API */}
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full",
                isActive
                  ? "bg-primary/20 text-primary/80"
                  : "bg-foreground/5 text-muted-foreground"
              )}
            >
              {view.filter_rules.length}
            </span>
          </button>
        );
      })}
    </div>
  );
}
