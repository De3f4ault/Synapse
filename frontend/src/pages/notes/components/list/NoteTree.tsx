import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight,
    Folder,
    FolderOpen,
    FileText,
    Trash2,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NeuralItemProps } from '../../types/notes.types';

/**
 * Neural Item - Recursive Tree Node - Synapse Creative Edition
 * Features: Animated connections, energy flow, depth indicators
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
        {/* Neural connection line with energy pulse */}
        {level > 0 && (
            <div
            className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--synapse-cyan)]/30 via-[var(--synapse-cyan)]/10 to-transparent"
            style={{ left: `${level * 20 - 10}px` }}
            >
            {/* Energy pulse effect */}
            <motion.div
            animate={{
                y: ['-100%', '100%'],
                opacity: [0, 1, 0]
            }}
            transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
                delay: level * 0.2
            }}
            className="absolute w-full h-4 bg-gradient-to-b from-transparent via-[var(--synapse-cyan)] to-transparent"
            />
            </div>
        )}

        {/* Node button */}
        <button
        onClick={() => {
            if (hasChildren) toggleExpand(item.id);
            onSelect(item.id);
        }}
        className={cn(
            'w-full flex items-center gap-2 py-2.5 px-3 rounded-lg border-l-2 transition-all duration-200 group relative overflow-hidden',
            isSelected
            ? 'bg-[var(--synapse-cyan)]/20 border-[var(--synapse-cyan)] text-[var(--synapse-cyan)] shadow-[0_0_20px_rgba(34,211,238,0.1)]'
            : 'border-transparent text-[var(--synapse-text-tertiary)] hover:text-[var(--synapse-text-primary)] hover:bg-[var(--synapse-panel-hover)] hover:border-[var(--synapse-cyan)]/20'
        )}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
        >
        {/* Scan line hover effect */}
        <motion.div
        animate={{
            x: ['-100%', '100%']
        }}
        transition={{
            duration: 1,
            repeat: Infinity,
            repeatDelay: 2,
            ease: 'linear'
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--synapse-cyan)]/10 to-transparent opacity-0 group-hover:opacity-100"
        style={{ width: '30%' }}
        />

        {/* Depth indicator dots */}
        {level > 0 && (
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex gap-1">
            {Array.from({ length: level }).map((_, i) => (
                <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                    "w-1 h-1 rounded-full",
                    isSelected ? "bg-[var(--synapse-cyan)]" : "bg-[var(--synapse-border-subtle)]"
                )}
                />
            ))}
            </div>
        )}

        {/* Expansion Arrow / Icon */}
        {hasChildren ? (
            <>
            <motion.span
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex-shrink-0"
            >
            <ChevronRight size={12} />
            </motion.span>
            {isExpanded ? (
                <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                >
                <FolderOpen size={14} className="text-[var(--synapse-amber)]" />
                </motion.div>
            ) : (
                <Folder size={14} className="text-[var(--synapse-text-dim)] group-hover:text-[var(--synapse-amber)] transition-colors" />
            )}
            </>
        ) : (
            <>
            <div className="w-3 flex-shrink-0" />
            <motion.div
            whileHover={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 0.5 }}
            >
            <FileText
            size={14}
            className={cn(
                isSelected
                ? 'text-[var(--synapse-cyan)]'
                : 'text-[var(--synapse-text-dim)]'
            )}
            />
            </motion.div>
            </>
        )}

        {/* Title */}
        <span
        className={cn(
            'flex-1 text-xs font-mono tracking-wide truncate text-left uppercase',
            isSelected ? 'text-[var(--synapse-cyan)] font-bold' : ''
        )}
        >
        {item.title || 'Untitled'}
        </span>

        {/* Activity indicator for recently updated notes */}
        {!hasChildren && (
            <motion.div
            animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.9, 1.1, 0.9]
            }}
            transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
            }}
            className="opacity-0 group-hover:opacity-100"
            >
            <Zap size={10} className="text-[var(--synapse-cyan)]" />
            </motion.div>
        )}

        {/* Delete Action */}
        {!hasChildren && (
            <motion.button
            initial={{ opacity: 0, x: -10 }}
            whileHover={{ scale: 1.1 }}
            onClick={(e) => onDelete(item.id, e)}
            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-[var(--synapse-red)]/20 rounded text-[var(--synapse-text-dim)] hover:text-[var(--synapse-red)] transition-all"
            title="Archive Fragment"
            >
            <Trash2 size={12} />
            </motion.button>
        )}

        {/* Selection glow */}
        {isSelected && (
            <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 bg-[var(--synapse-cyan)]/5 rounded-lg"
            />
        )}
        </button>

        {/* Children with stagger animation */}
        <AnimatePresence>
        {isExpanded && hasChildren && (
            <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
            >
            {item.children!.map((child, index) => (
                <motion.div
                key={child.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                >
                <NeuralItem
                item={child}
                level={level + 1}
                selectedId={selectedId}
                expandedIds={expandedIds}
                toggleExpand={toggleExpand}
                onSelect={onSelect}
                onDelete={onDelete}
                />
                </motion.div>
            ))}
            </motion.div>
        )}
        </AnimatePresence>
        </motion.div>
    );
};

/**
 * Note Tree Container with Neural Network Visualization
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
        className="relative"
        >
        {/* Neural grid background */}
        <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
            backgroundImage: `
            radial-gradient(circle at center, var(--synapse-cyan) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
        }}
        />

        <div className="relative z-10">
        {items.map((item, index) => (
            <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            >
            <NeuralItem
            item={item}
            level={0}
            selectedId={selectedId}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
            onSelect={onSelect}
            onDelete={onDelete}
            />
            </motion.div>
        ))}
        </div>
        </motion.div>
    );
};
