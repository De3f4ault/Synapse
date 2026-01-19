import { LayoutGrid, List, Kanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { ViewMode } from "@/modules/notes/types";

interface ViewToggleProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex bg-zinc-800/50 p-1 rounded-lg border border-white/5 space-x-1">
      <button
        onClick={() => onViewChange('list')}
        className={cn(
          "p-1.5 rounded-md transition-all",
          view === 'list' 
            ? "bg-zinc-700 text-white shadow-sm" 
            : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
        )}
        title="List View"
      >
        <List size={16} />
      </button>
      <button
        onClick={() => onViewChange('grid')}
        className={cn(
          "p-1.5 rounded-md transition-all",
          view === 'grid' 
            ? "bg-zinc-700 text-white shadow-sm" 
            : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
        )}
        title="Grid View"
      >
        <LayoutGrid size={16} />
      </button>
      <button
        onClick={() => onViewChange('masonry')}
        className={cn(
          "p-1.5 rounded-md transition-all",
          view === 'masonry' 
            ? "bg-zinc-700 text-white shadow-sm" 
            : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
        )}
        title="Masonry View"
      >
        <Kanban size={16} className="rotate-90" />
      </button>
    </div>
  );
}
