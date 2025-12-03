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
 * Neural Item - Recursive Tree Node Component
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
        {/* Connecting Line */}
        {level > 0 && (
            <div
            className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-500/20 via-cyan-500/10 to-transparent"
            style={{ left: `${level * 20 - 10}px` }}
            />
        )}

        <button
        onClick={() => {
            if (hasChildren) toggleExpand(item.id);
            onSelect(item.id);
        }}
        className={cn(
            'w-full flex items-center gap-2 py-2 px-3 rounded-lg border-l-2 transition-all duration-200 group relative overflow-hidden',
            isSelected
            ? 'bg-cyan-950/40 border-cyan-500 text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.1)]'
            : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5 hover:border-cyan-500/20'
        )}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
        >
        {/* Hover Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        {/* Expansion Arrow / Icon */}
        {hasChildren ? (
            <>
            <motion.span
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            >
            <ChevronRight size={12} />
            </motion.span>
            {isExpanded ? (
                <FolderOpen size={14} className="text-amber-400" />
            ) : (
                <Folder size={14} className="text-slate-500 group-hover:text-amber-300" />
            )}
            </>
        ) : (
            <>
            <div className="w-3" />
            <FileText size={14} className={cn(isSelected ? 'text-cyan-400' : 'text-slate-600')} />
            </>
        )}

        {/* Title */}
        <span
        className={cn(
            'flex-1 text-xs font-mono tracking-wide truncate text-left',
            isSelected ? 'text-cyan-50 font-bold' : ''
        )}
        >
        {item.title || 'Untitled'}
        </span>

        {/* Delete Action */}
        {!hasChildren && (
            <button
            onClick={(e) => onDelete(item.id, e)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-slate-600 hover:text-red-400 transition-all"
            title="Archive Fragment"
            >
            <Trash2 size={12} />
            </button>
        )}
        </button>

        {/* Children */}
        <AnimatePresence>
        {isExpanded && hasChildren && (
            <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
            >
            {item.children!.map((child) => (
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
 * Note Tree Container
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
        <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.03 }}
        >
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
        </motion.div>
    );
};
