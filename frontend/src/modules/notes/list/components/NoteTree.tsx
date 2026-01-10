/**
 * Notes Module - NoteTree Component
 * Hierarchical tree view for notes with expand/collapse.
 *
 * MIGRATED FROM: pages/notes/components/list/NoteTree.tsx
 * PATTERN: Uses listStore for state, not props drilling.
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronRight,
    Folder,
    FolderOpen,
    FileText,
    Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NoteTreeItem } from "../../core";

// ============================================================================
// Types
// ============================================================================

interface NeuralItemProps {
    item: NoteTreeItem;
    level: number;
    selectedId: number | null;
    expandedIds: Set<number>;
    toggleExpand: (id: number) => void;
    onSelect: (id: number) => void;
    onDelete: (id: number, e: React.MouseEvent) => void;
}

interface NoteTreeProps {
    items: NoteTreeItem[];
    selectedId: number | null;
    expandedIds: Set<number>;
    toggleExpand: (id: number) => void;
    onSelect: (id: number) => void;
    onDelete: (id: number, e: React.MouseEvent) => void;
}

// ============================================================================
// NeuralItem Component
// ============================================================================

/**
 * Single tree node with expand/collapse, selection, and delete.
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
                    className="absolute left-0 top-0 bottom-0 w-px bg-white/10"
                    style={{ left: `${level * 20 - 10}px` }}
                />
            )}

            {/* Node content */}
            <button
                onClick={() =>
                    hasChildren ? toggleExpand(item.id) : onSelect(item.id)
                }
                className={cn(
                    "group relative w-full flex items-center gap-2 p-2 rounded-lg transition-all border border-transparent",
                    isSelected
                        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_10px_rgba(34,211,238,0.1)]"
                        : "hover:bg-white/5 text-slate-400 hover:text-slate-200",
                )}
                style={{ paddingLeft: `${level * 20 + 8}px` }}
            >
                {/* Icon and chevron */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {hasChildren && (
                        <motion.div
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-slate-600"
                        >
                            <ChevronRight size={14} />
                        </motion.div>
                    )}

                    {hasChildren ? (
                        isExpanded ? (
                            <FolderOpen
                                size={16}
                                className={isSelected ? "text-cyan-400" : "text-amber-500/80"}
                            />
                        ) : (
                            <Folder
                                size={16}
                                className={isSelected ? "text-cyan-400" : "text-amber-500/60"}
                            />
                        )
                    ) : (
                        <FileText
                            size={14}
                            className={isSelected ? "text-cyan-400" : "text-slate-600"}
                        />
                    )}
                </div>

                {/* Title */}
                <span
                    className={cn(
                        "flex-1 text-left text-sm truncate",
                        isSelected ? "font-bold" : "font-medium",
                    )}
                >
                    {item.title || "Untitled"}
                </span>

                {/* Delete button for leaf nodes */}
                {!hasChildren && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        whileHover={{ scale: 1.1 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(item.id, e);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 rounded text-slate-600 hover:text-red-400 transition-all cursor-pointer"
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
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {item.children?.map((child) => (
                            <NeuralItem
                                key={child.id}
                                item={child as NoteTreeItem}
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

// ============================================================================
// NoteTree Component
// ============================================================================

/**
 * Hierarchical tree view for notes.
 */
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
