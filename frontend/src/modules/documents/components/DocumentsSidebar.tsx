import { Filter, Layers, FolderOpen, Hash, Clock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NeumorphicButton } from "@/components/neumorphic";
import { GlassCard } from "@/shared/ui";

interface DocumentsSidebarProps {
    className?: string;
    activeSector: string;
    onSectorChange: (sector: string) => void;
    totalDocuments: number;
    sectors: string[]; // List of available sectors/folders
    onUpload?: () => void;
    isCollapsed?: boolean;
}

export const DocumentsSidebar = ({
    className,
    activeSector,
    onSectorChange,
    totalDocuments,
    sectors,
    onUpload,
    isCollapsed = false
}: DocumentsSidebarProps) => {
    // Default sectors if none provided
    const displaySectors = sectors.length > 0 ? sectors : ["All", "Technical", "Financial", "Legal", "Personal", "Research"];

    return (
        <GlassCard
            className={cn(
                "flex h-full w-full flex-col bg-zinc-950/40 backdrop-blur-3xl border border-white/10 transition-all duration-300 ease-in-out",
                className
            )}
        >
            {/* Header / Upload Action */}
            <div className="p-4 flex flex-col gap-4 shrink-0">
                <div className={cn("flex items-center gap-2 transition-opacity duration-200", isCollapsed ? "justify-center" : "")}>
                    <FolderOpen className={cn("text-cyan-400 transition-all", isCollapsed ? "w-8 h-8" : "w-5 h-5")} />
                    {!isCollapsed && (
                        <h2 className="text-xl font-bold text-white whitespace-nowrap">Library</h2>
                    )}
                </div>

                {!isCollapsed && (
                    <div className="flex gap-4 text-xs text-slate-400 px-1">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-cyan-400" />
                            {totalDocuments} Items
                        </span>
                    </div>
                )}

                {/* Primary Upload Button */}
                <NeumorphicButton
                    onClick={onUpload}
                    className={cn(
                        "w-full flex items-center justify-center gap-2 font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-none shadow-lg shadow-cyan-900/20",
                        isCollapsed ? "p-3 rounded-full aspect-square w-12" : "py-3 rounded-xl"
                    )}
                    title="Upload"
                >
                    <Plus className="w-5 h-5" />
                    {!isCollapsed && <span>Upload</span>}
                </NeumorphicButton>
            </div>

            {/* Navigation / Filters */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-6 py-2 px-3 scrollbar-hide">

                {/* Sectors Group */}
                <div className="space-y-2">
                    {!isCollapsed && (
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 font-bold px-3 mb-2">
                            <Filter className="w-3 h-3" />
                            <span>Sectors</span>
                        </div>
                    )}

                    {displaySectors.map((sector) => {
                        const isActive = activeSector === sector;
                        return (
                            <div
                                key={sector}
                                onClick={() => onSectorChange(sector)}
                                title={isCollapsed ? sector : undefined}
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
                                        <Layers className="w-4 h-4" />
                                    </div>
                                    {!isCollapsed && (
                                        <span className={cn(
                                            "text-sm font-medium transition-colors truncate whitespace-nowrap",
                                            isActive ? "text-cyan-100" : "text-slate-400 group-hover:text-slate-200"
                                        )}>
                                            {sector}
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
                            <Hash className="w-3 h-3" />
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

            {/* Footer Hint / User */}
            {!isCollapsed && (
                <div className="p-4 mx-4 mb-4 rounded-xl bg-white/5 border border-white/5 shrink-0">
                    <p className="text-xs text-slate-400 text-center leading-relaxed">
                        Drag files to organize
                    </p>
                </div>
            )}
        </GlassCard>
    );
};
