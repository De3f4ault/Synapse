import { ViewToggle } from "./ViewToggle";
import { ViewMode } from "@/modules/notes/types";
import { Button } from "@/components/ui/button";
import { Plus, Filter, ArrowUpDown } from "lucide-react";

interface AllDocsHeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onCreatePage: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function AllDocsHeader({ 
  viewMode, 
  onViewModeChange, 
  onCreatePage,
  searchQuery,
  onSearchChange 
}: AllDocsHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0a0a]/50">
      {/* Title */}
      <div className="text-xl font-semibold text-white">All Docs</div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="relative">
          <input 
            className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-zinc-200 w-48 focus:outline-none focus:border-blue-500/50 transition-colors"
            placeholder="Search docs..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* View Toggle */}
        <ViewToggle view={viewMode} onViewChange={onViewModeChange} />

        <div className="h-6 w-px bg-white/10 mx-1" />

        {/* Filter & Sort */}
        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white gap-2">
          <Filter size={16} />
          <span>Filter</span>
        </Button>
        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white gap-2">
          <ArrowUpDown size={16} />
          <span>Sort</span>
        </Button>

        <div className="h-6 w-px bg-white/10 mx-1" />

        {/* New Page Button */}
        <Button onClick={onCreatePage} className="bg-blue-600 hover:bg-blue-500 text-white gap-2">
          <Plus size={16} />
          <span>New Page</span>
        </Button>
      </div>
    </div>
  );
}
