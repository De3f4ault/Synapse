import { Grid, AlignLeft, Upload } from "lucide-react";
import { FloatingPageDock } from "@/components/layout/FloatingPageDock";
import { cn } from "@/lib/utils";

interface QuizDockProps {
    viewMode: "grid" | "list";
    onViewChange: (mode: "grid" | "list") => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onImport: () => void;
}

export const QuizDock = ({
    viewMode,
    onViewChange,
    searchQuery,
    onSearchChange,
    onImport
}: QuizDockProps) => {
    return (
        <FloatingPageDock className="justify-between">
            {/* View Toggle */}
            <div className="flex bg-foreground/5 rounded-full p-0.5 border border-border">
                <button
                    onClick={() => onViewChange('grid')}
                    className={cn(
                        'p-2 rounded-full transition-all',
                        viewMode === 'grid'
                            ? 'bg-foreground/10 text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                    )}
                >
                    <Grid size={16} />
                </button>
                <button
                    onClick={() => onViewChange('list')}
                    className={cn(
                        'p-2 rounded-full transition-all',
                        viewMode === 'list'
                            ? 'bg-foreground/10 text-primary'
                            : 'text-muted-foreground hover:text-foreground'
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
                    placeholder="Search quizzes..."
                    className="w-full h-10 bg-foreground/5 border border-border rounded-full px-4 text-sm text-foreground/70 placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
                />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onImport}
                    className="h-10 px-5 rounded-full bg-muted/50 border border-border text-foreground/80 flex items-center gap-2 hover:bg-muted transition-colors text-sm font-medium"
                >
                    <Upload size={16} />
                    <span className="hidden sm:inline">Import</span>
                </button>
            </div>
        </FloatingPageDock>
    );
};
