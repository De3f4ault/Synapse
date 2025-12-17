import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight,
    Folder,
    FolderOpen,
    FileText,
    Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NeuralItemProps } from '../../types/notes.types';

/**
 * Clean Tree Node Component
 * Minimal, professional design matching the notes aesthetic
 */
export const NeuralItem: React.FC<NeuralItemProps> = ({
    item,
    level,
    selectedId,
    expandedIds,
    toggleExpand,
    onSelect,
    onDelete,
}) => {
    const isSelected = selectedId === item.id;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedIds.has(item.id);

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative"
        >
            {/* Connection line */}
            {level > 0 && (
                <div
                    className="absolute left-0 top-0 bottom-0 w-px bg-border"
                    style={{ left: `${level * 20 - 10}px` }}
                />
            )}

            {/* Node content */}
            <button
                onClick={() => hasChildren ? toggleExpand(item.id) : onSelect(item.id)}
                className={cn(
                    "group relative w-full flex items-center gap-2 p-2 rounded-lg transition-all",
                    isSelected
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-accent text-foreground"
                )}
                style={{ paddingLeft: `${level * 20 + 8}px` }}
            >
                {/* Icon and chevron */}
                <div className="flex items-center gap-1.5">
                    {hasChildren && (
                        <motion.div
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronRight size={14} className="text-muted-foreground" />
                        </motion.div>
                    )}

                    {hasChildren ? (
                        isExpanded ? (
                            <FolderOpen size={16} className={isSelected ? "text-primary" : "text-amber-600"} />
                        ) : (
                            <Folder size={16} className={isSelected ? "text-primary" : "text-amber-600"} />
                        )
                    ) : (
                        <FileText size={14} className={isSelected ? "text-primary" : "text-muted-foreground"} />
                    )}
                </div>

                {/* Title */}
                <span className={cn(
                    "flex-1 text-left text-sm truncate",
                    isSelected ? "font-medium" : ""
                )}>
                    {item.title || 'Untitled'}
                </span>

                {/* Delete button for leaf nodes */}
                {!hasChildren && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        whileHover={{ scale: 1.1 }}
                        onClick={(e) => { e.stopPropagation(); onDelete(item.id, e); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                        title="Delete note"
                    >
                        <Trash2 size={12} />
                    </motion.div>
                )}
            </button>

            {/* Children */}
            <AnimatePresence>
                {hasChildren && isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {item.children?.map((child) => (
                            <NeuralItem
                                key={child.id}
                                item={child}
                                level={level + 1}
                                selectedId={selectedId}
                                expandedIds={expandedIds}
                                toggleExpand={toggleExpand}
                                onSelect={onSelect}
                                onDelete={onDelete}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

/**
 * Note Tree Component
 */
interface NoteTreeProps {
    items: any[];
    selectedId: number | null;
    expandedIds: Set<number>;
    toggleExpand: (id: number) => void;
    onSelect: (id: number) => void;
    onDelete: (id: number, e: React.MouseEvent) => void;
}

export const NoteTree: React.FC<NoteTreeProps> = ({
    items,
    selectedId,
    expandedIds,
    toggleExpand,
    onSelect,
    onDelete,
}) => {
    return (
        <div className="space-y-1">
            {items.map((item) => (
                <NeuralItem
                    key={item.id}
                    item={item}
                    level={0}
                    selectedId={selectedId}
                    expandedIds={expandedIds}
                    toggleExpand={toggleExpand}
                    onSelect={onSelect}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
};
