import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DocumentSector } from '../../types/documents.types';

interface FilterBarProps {
    sectors: DocumentSector[];
    activeSector: DocumentSector;
    onSectorChange: (sector: DocumentSector) => void;
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
        <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
        {sectors.map((sector) => (
            <button
            key={sector}
            onClick={() => {
                onSectorChange(sector);
                logAction?.(`SECTOR CHANGE: ${sector.toUpperCase()}`);
            }}
            className={cn(
                'px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all',
                activeSector === sector
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            )}
            >
            {sector}
            </button>
        ))}
        </div>

        <div className="h-6 w-px bg-white/10 mx-1" />

        {/* Search Bar */}
        <div className="flex-1 relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3 h-3 group-focus-within:text-cyan-400" />
        <input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="SEARCH ARCHIVES..."
        className="w-full bg-black/40 border border-white/5 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/30 focus:bg-black/60 transition-all font-mono tracking-wide"
        />
        </div>
        </div>
    );
};
