import React from 'react';
import { Search, Plus } from 'lucide-react';

interface QuizFiltersProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onCreateNew: () => void;
}

/**
 * Search and filter controls for quizzes
 */
export const QuizFilters: React.FC<QuizFiltersProps> = ({
    searchQuery,
    onSearchChange,
    onCreateNew,
}) => {
    return (
        <div className="flex items-center gap-4 w-full md:w-auto">
        {/* Search Bar */}
        <div className="relative flex-1 md:w-72 group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
        <input
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="SEARCH DATABASE..."
        className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-xs font-mono text-white focus:border-cyan-500/50 outline-none transition-all placeholder:text-slate-600 tracking-wider"
        />
        </div>

        {/* New Simulation Button */}
        <button
        onClick={onCreateNew}
        className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-white transition-all uppercase tracking-[0.15em] group whitespace-nowrap"
        >
        <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300 text-cyan-500" />
        New Simulation
        </button>
        </div>
    );
};
