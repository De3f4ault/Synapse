import { Grid, AlignLeft, Plus, Search } from "lucide-react";
import { FloatingPageDock } from "@/components/layout/FloatingPageDock";
import { cn } from "@/lib/utils";

interface NotesDockProps {
    viewMode: "grid" | "list";
    onViewChange: (mode: "grid" | "list") => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onCreate: () => void;
}

export const NotesDock = ({
    viewMode,
    onViewChange,
    searchQuery,
    onSearchChange,
    onCreate
}: NotesDockProps) => {
    return (
        <FloatingPageDock className="justify-between">
            {/* View Toggle */}
            <div className="flex bg-white/5 rounded-full p-0.5 border border-white/10">
                <button
                    onClick={() => onViewChange('grid')}
                    className={cn(
                        'p-2 rounded-full transition-all',
                        viewMode === 'grid'
                            ? 'bg-white/10 text-cyan-400'
                            : 'text-slate-500 hover:text-white'
                    )}
                >
                    <Grid size={16} />
                </button>
                <button
                    onClick={() => onViewChange('list')}
                    className={cn(
                        'p-2 rounded-full transition-all',
                        viewMode === 'list'
                            ? 'bg-white/10 text-cyan-400'
                            : 'text-slate-500 hover:text-white'
                    )}
                >
                    <AlignLeft size={16} />
                </button>
            </div>

            {/* Search Bar - Expanded in Dock */}
            <div className="flex-1 max-w-md mx-4 hidden md:block relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search notes..."
                    className="w-full h-10 bg-white/5 border border-white/10 rounded-full pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
                />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onCreate}
                    className="h-10 px-5 rounded-full bg-cyan-600/50 border border-white/10 text-cyan-100 flex items-center gap-2 hover:bg-cyan-600 transition-colors text-sm font-medium shadow-lg shadow-cyan-900/20"
                >
                    <Plus size={16} />
                    <span className="hidden sm:inline">New Note</span>
                </button>
            </div>
        </FloatingPageDock>
    );
};
