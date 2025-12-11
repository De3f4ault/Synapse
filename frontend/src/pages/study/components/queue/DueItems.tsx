import { useDueItems } from '../../hooks/useDueItems';
import { ItemCard } from './ItemCard';
import { Play, Filter, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import type { StudyItem } from '../../types/study.types';

interface DueItemsProps {
    modules?: string;
    limit?: number;
    onStartSession: (items: StudyItem[]) => void;
}

export function DueItems({ modules, limit, onStartSession }: DueItemsProps) {
    const { data: items, isLoading } = useDueItems(modules, limit);
    const [selectedItems, setSelectedItems] = useState<number[]>([]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mb-4" />
                <p className="text-sm font-mono uppercase tracking-wider">Loading Queue...</p>
            </div>
        );
    }

    if (!items || items.length === 0) {
        return (
            <div className="text-center py-16 border border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                <div className="w-16 h-16 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 mb-4">
                    <CheckCircle2 size={32} className="text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">All Caught Up!</h3>
                <p className="text-slate-500 text-sm">No items due for review right now.</p>
            </div>
        );
    }

    const handleToggleItem = (id: number) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleStartAll = () => {
        onStartSession(items);
    };

    const handleStartSelected = () => {
        const selected = items.filter(item => selectedItems.includes(item.id));
        onStartSession(selected);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between sticky top-0 md:relative z-10 bg-[#020408]/80 backdrop-blur-md md:bg-transparent p-4 md:p-0 -mx-4 md:mx-0 border-b border-white/5 md:border-none">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        Review Queue
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs text-[10px] border border-cyan-500/20">
                            {items.length}
                        </span>
                    </h3>
                    {selectedItems.length > 0 && (
                        <p className="text-xs text-cyan-400 font-mono mt-1">
                            {selectedItems.length} selected
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    <button className="synapse-button p-2.5">
                        <Filter size={16} />
                    </button>
                    <button
                        onClick={selectedItems.length > 0 ? handleStartSelected : handleStartAll}
                        className="synapse-button-primary synapse-button flex items-center gap-2"
                    >
                        <Play size={16} fill="currentColor" />
                        <span>Start {selectedItems.length > 0 ? 'Selection' : 'Session'}</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map((item, index) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <ItemCard
                            item={item}
                            onClick={() => handleToggleItem(item.id)}
                            selected={selectedItems.includes(item.id)}
                        />
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
