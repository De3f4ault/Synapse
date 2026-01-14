import { Filter, FileText, Hash, Clock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NeumorphicButton } from "@/components/neumorphic";
import { GlassCard } from "@/shared/ui";

interface NotesSidebarProps {
    className?: string;
    activeFilter: string;
    onFilterChange: (filter: string) => void;
    totalNotes: number;
    tags: string[];
    onCreate?: () => void;
    isCollapsed?: boolean;
}

export const NotesSidebar = ({
    className,
    activeFilter,
    onFilterChange,
    totalNotes,
    tags,
    onCreate,
    isCollapsed = false
}: NotesSidebarProps) => {
    // Default tags if none provided
    const displayTags = tags.length > 0 ? tags : ["All", "Personal", "Work", "Ideas", "Journal"];

    return (
        <GlassCard
            className={cn(
                "flex h-full w-full flex-col bg-zinc-950/40 backdrop-blur-3xl border-r border-white/10 rounded-none transition-all duration-300 ease-in-out",
                className
            )}
        >
            {/* Header / Actions */}
            <div className="p-4 flex flex-col gap-4 shrink-0">
                <div className={cn("flex items-center gap-2 transition-opacity duration-200", isCollapsed ? "justify-center" : "")}>
                    <FileText className={cn("text-cyan-400 transition-all", isCollapsed ? "w-8 h-8" : "w-5 h-5")} />
                    {!isCollapsed && (
                        <h2 className="text-xl font-bold text-white whitespace-nowrap">Notes</h2>
                    )}
                </div>

                {!isCollapsed && (
                    <div className="flex gap-4 text-xs text-slate-400 px-1">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-cyan-400" />
                            {totalNotes} Notes
                        </span>
                    </div>
                )}

                {/* Primary Actions */}
                <div className={cn("flex flex-col gap-2", isCollapsed ? "items-center" : "")}>
                    <NeumorphicButton
                        onClick={onCreate}
                        className={cn(
                            "flex items-center justify-center gap-2 font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-none shadow-lg shadow-cyan-900/20",
                            isCollapsed ? "p-3 rounded-full aspect-square w-12" : "w-full py-3 rounded-xl"
                        )}
                        title="Create Note"
                    >
                        <Plus className="w-5 h-5" />
                        {!isCollapsed && <span>Create Note</span>}
                    </NeumorphicButton>
                </div>
            </div>

            {/* Navigation / Filters */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-6 py-2 px-3 scrollbar-hide">

                {/* Tags */}
                <div className="space-y-2">
                    {!isCollapsed && (
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 font-bold px-3 mb-2">
                            <Filter className="w-3 h-3" />
                            <span>Tags</span>
                        </div>
                    )}

                    {displayTags.map((tag) => {
                        const isActive = activeFilter === tag;
                        return (
                            <div
                                key={tag}
                                onClick={() => onFilterChange(tag)}
                                title={isCollapsed ? tag : undefined}
                                className={cn(
                                    "group flex items-center p-2 rounded-xl cursor-pointer transition-all duration-200",
                                    isActive
                                        ? "bg-cyan-500/10 border border-cyan-500/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                                        : "hover:bg-white/5 border border-transparent",
                                    isCollapsed ? "justify-center" : "justify-between"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 shrink-0",
                                        isActive ? "bg-cyan-500/20 text-cyan-400" : "bg-white/5 text-slate-500 group-hover:text-slate-300"
                                    )}>
                                        <Hash className="w-4 h-4" />
                                    </div>
                                    {!isCollapsed && (
                                        <span className={cn(
                                            "text-sm font-medium transition-colors truncate whitespace-nowrap",
                                            isActive ? "text-cyan-100" : "text-slate-400 group-hover:text-slate-200"
                                        )}>
                                            {tag}
                                        </span>
                                    )}
                                </div>
                                {!isCollapsed && isActive && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)] shrink-0" />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Smart Views */}
                <div className={cn("space-y-2 pt-4 border-t border-white/5", isCollapsed && "border-none pt-2")}>
                    {!isCollapsed && (
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 font-bold px-3 mb-2">
                            <Clock className="w-3 h-3" />
                            <span>Views</span>
                        </div>
                    )}

                    {['Recent', 'Favorites', 'Archived'].map((view) => (
                        <div
                            key={view}
                            title={isCollapsed ? view : undefined}
                            className={cn(
                                "group flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-white/5 border border-transparent transition-all duration-200",
                                isCollapsed ? "justify-center" : ""
                            )}
                        >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-slate-500 group-hover:text-slate-300 transition-colors shrink-0">
                                <Clock className="w-4 h-4" />
                            </div>
                            {!isCollapsed && (
                                <span className="text-sm font-medium text-slate-400 group-hover:text-slate-200 transition-colors">
                                    {view}
                                </span>
                            )}
                        </div>
                    ))}
                </div>

            </div>

            {/* Footer Hint */}
            {!isCollapsed && (
                <div className="p-4 mx-4 mb-4 rounded-xl bg-white/5 border border-white/5 shrink-0">
                    <p className="text-xs text-slate-400 text-center leading-relaxed">
                        Capture your thoughts instantly.
                    </p>
                </div>
            )}
        </GlassCard>
    );
};
