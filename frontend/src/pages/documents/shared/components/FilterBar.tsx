import React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentSector } from "../../core";

interface FilterBarProps {
    sectors: DocumentSector[];
    activeSector: DocumentSector | "All";
    onSectorChange: (sector: DocumentSector | "All") => void;
    search: string;
    onSearchChange: (search: string) => void;
    logAction?: (msg: string) => void;
}

/**
 * Filter and search bar for documents
 */
export const FilterBar: React.FC<FilterBarProps> = ({
    sectors,
    activeSector,
    onSectorChange,
    search,
    onSearchChange,
    logAction,
}) => {
    return (
        <div className="flex items-center gap-3">
            {/* Sector Tabs */}
            <div className="flex bg-black/20 rounded-xl p-1 border border-white/5">
                {sectors.map((sector) => (
                    <button
                        key={sector}
                        onClick={() => {
                            onSectorChange(sector);
                            logAction?.(`SECTOR CHANGE: ${sector.toUpperCase()}`);
                        }}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                            activeSector === sector
                                ? "bg-cyan-500/20 text-cyan-400 shadow-sm"
                                : "text-slate-500 hover:text-slate-300 hover:bg-white/5",
                        )}
                    >
                        {sector}
                    </button>
                ))}
            </div>

            <div className="h-6 w-px bg-white/10 mx-1" />

            {/* Search Bar */}
            <div className="flex-1 relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 group-focus-within:text-cyan-400 transition-colors" />
                <input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search archives..."
                    className="synapse-input w-full pl-10"
                />
            </div>
        </div>
    );
};
