import { Grid, AlignLeft, Upload } from "lucide-react";
import { FloatingPageDock } from "@/components/layout/FloatingPageDock";
import { cn } from "@/lib/utils";

interface FlashcardsDockProps {
    viewMode: "grid" | "list";
    onViewChange: (mode: "grid" | "list") => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onImport: () => void;
}

export const FlashcardsDock = ({
    viewMode,
    onViewChange,
    searchQuery,
    onSearchChange,
    onImport
}: FlashcardsDockProps) => {
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
            <div className="flex-1 max-w-md mx-4 hidden md:block">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search decks..."
                    className="w-full h-10 bg-white/5 border border-white/10 rounded-full px-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
                />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onImport}
                    className="h-10 px-5 rounded-full bg-slate-700/50 border border-white/10 text-slate-300 flex items-center gap-2 hover:bg-slate-700 transition-colors text-sm font-medium"
                >
                    <Upload size={16} />
                    <span className="hidden sm:inline">Import</span>
                </button>
            </div>
        </FloatingPageDock>
    );
};
