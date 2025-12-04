import React from 'react';
import { Search } from 'lucide-react';

interface NoteSearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

/**
 * Search input for filtering notes
 */
export const NoteSearch: React.FC<NoteSearchProps> = ({
    value,
    onChange,
    placeholder = 'SEARCH PATHS...',
}) => {
    return (
        <div className="relative flex-1 group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-500 transition-colors" size={14} />
        <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-9 pr-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-700 uppercase tracking-wider"
        />
        </div>
    );
};
