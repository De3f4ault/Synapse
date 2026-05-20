import { Filter, Layers, Clock, Plus, FileQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarShell } from "@/shared/ui";

interface QuizzesSidebarProps {
    className?: string;
    activeFilter: string;
    onFilterChange: (filter: string) => void;
    totalQuizzes: number;
    onNewQuiz: () => void;
}

export const QuizzesSidebar = ({
    className,
    activeFilter,
    onFilterChange,
    totalQuizzes,
    onNewQuiz,
}: QuizzesSidebarProps) => {
    const categories = ["All", "Science", "History", "Technology", "Psychology"];

    return (
        <SidebarShell
            storageKey="quizzesSidebarCollapsed"
            title="Quizzes"
            titleIcon={FileQuestion}
            primaryAction={{
                label: "New Quiz",
                icon: Plus,
                onClick: onNewQuiz,
            }}
            statsLine={
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    {totalQuizzes} Items
                </span>
            }
            className={className}
        >
            {(isCollapsed) => (
                <>
                    {/* Categories */}
                    <div className="space-y-1">
                        {!isCollapsed && (
                            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-3 mb-2">
                                <Filter className="w-3 h-3" />
                                <span>Categories</span>
                            </div>
                        )}

                        {categories.map((category) => {
                            const isActive = activeFilter === category;
                            return (
                                <div
                                    key={category}
                                    onClick={() => onFilterChange(category)}
                                    className={cn(
                                        "group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors",
                                        isActive
                                            ? "bg-muted border border-border text-foreground"
                                            : "text-foreground/80 hover:text-foreground hover:bg-muted/50 border border-transparent",
                                    )}
                                >
                                    <Layers className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                                    <span className="flex-1 truncate">{category}</span>
                                    {isActive && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Smart Views */}
                    <div className="space-y-1 pt-4 mt-4 border-t border-border">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-3 mb-2">
                            <Clock className="w-3 h-3" />
                            <span>Views</span>
                        </div>

                        {['Recent', 'Favorites', 'Completed'].map((view) => (
                            <div
                                key={view}
                                className={cn(
                                    "group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors",
                                    "text-foreground/80 hover:text-foreground hover:bg-muted/50 border border-transparent",
                                )}
                            >
                                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground group-hover:text-foreground/70 transition-colors">
                                    {view}
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </SidebarShell>
    );
};
