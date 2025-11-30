import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    ZoomIn, ZoomOut, Maximize2, Search, Filter, Layers, Layout
} from 'lucide-react';
import type { GraphFilters } from '../../types/graph.types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface GraphControlsProps {
    filters: GraphFilters;
    onToggleFilter: (filter: keyof GraphFilters) => void;
    onSearchChange: (query: string) => void;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onResetZoom?: () => void;
    stats?: { totalNodes: number; totalLinks: number; };
}

/**
 * GraphControls - "Command Deck" Style
 * Floating glass controls at bottom center/right.
 */
export function GraphControls({
    filters,
    onToggleFilter,
    onSearchChange,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    stats
}: GraphControlsProps) {

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-50 pointer-events-none">

        {/* 1. Search Pill */}
        <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pointer-events-auto flex items-center gap-2 p-1.5 rounded-full bg-[#0F0F0F]/90 backdrop-blur-xl border border-white/10 shadow-2xl"
        >
        <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
        <input
        type="text"
        placeholder="Search Nodes..."
        value={filters.searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="bg-transparent border-none outline-none text-xs text-white pl-8 pr-2 py-1.5 w-40 placeholder:text-slate-600 font-medium"
        />
        </div>
        </motion.div>

        {/* 2. Controls Pill */}
        <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-full bg-[#0F0F0F]/90 backdrop-blur-xl border border-white/10 shadow-2xl"
        >
        <ControlBtn icon={ZoomOut} onClick={onZoomOut} />
        <ControlBtn icon={Maximize2} onClick={onResetZoom} />
        <ControlBtn icon={ZoomIn} onClick={onZoomIn} />

        <div className="w-px h-4 bg-white/10 mx-1" />

        <Popover>
        <PopoverTrigger asChild>
        <button className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors relative">
        <Layers className="w-4 h-4" />
        <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-purple-500 rounded-full border border-black" />
        </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 bg-[#0A0A0A]/95 border-white/10 text-slate-200 backdrop-blur-xl mb-4">
        <div className="space-y-3 p-1">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Signal Filters</h4>
        {['Documents', 'Notes', 'Flashcards'].map(type => (
            <div key={type} className="flex items-center gap-2 text-xs">
            <input type="checkbox" className="rounded border-white/20 bg-white/5" checked />
            <span>{type}</span>
            </div>
        ))}
        </div>
        </PopoverContent>
        </Popover>
        </motion.div>

        {/* 3. Stats Pill (Optional) */}
        {stats && (
            <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="hidden md:flex pointer-events-auto items-center gap-3 px-4 py-2 rounded-full bg-[#0F0F0F]/90 backdrop-blur-xl border border-white/10 shadow-2xl"
            >
            <span className="text-[10px] text-slate-400 font-mono">
            <strong className="text-white">{stats.totalNodes}</strong> NODES
            </span>
            <span className="w-px h-3 bg-white/10" />
            <span className="text-[10px] text-slate-400 font-mono">
            <strong className="text-white">{stats.totalLinks}</strong> LINKS
            </span>
            </motion.div>
        )}
        </div>
    );
}

const ControlBtn = ({ icon: Icon, onClick }: any) => (
    <button onClick={onClick} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
    <Icon className="w-4 h-4" />
    </button>
);
