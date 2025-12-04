import { useDueItems } from '../../hooks/useDueItems';
import { ItemCard } from './ItemCard';
import { Button } from '@/components/ui/button';
import { Play, Filter } from 'lucide-react';
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
        return <div className="text-center py-8 text-muted-foreground">Loading due items...</div>;
    }

    if (!items || items.length === 0) {
        return (
            <div className="text-center py-12">
            <p className="text-lg font-medium mb-2">All caught up! 🎉</p>
            <p className="text-muted-foreground">No items due right now</p>
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
        <div className="space-y-4">
        <div className="flex items-center justify-between">
        <div>
        <h3 className="text-lg font-semibold">{items.length} Items Due</h3>
        {selectedItems.length > 0 && (
            <p className="text-sm text-muted-foreground">
            {selectedItems.length} selected
            </p>
        )}
        </div>
        <div className="flex gap-2">
        <Button variant="outline" size="sm">
        <Filter className="h-4 w-4 mr-2" />
        Filter
        </Button>
        <Button onClick={selectedItems.length > 0 ? handleStartSelected : handleStartAll}>
        <Play className="h-4 w-4 mr-2" />
        Start Session
        </Button>
        </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item, index) => (
            <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
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
