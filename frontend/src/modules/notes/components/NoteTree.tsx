import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  FolderOpen,
  Plus,
  GripVertical,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useNoteTree } from "../hooks/useNoteTree";
import type { NoteTreeNode } from "@/api/generated";

/**
 * Enhanced Note Tree Component
 *
 * Features:
 * - Hierarchical tree view with expand/collapse
 * - Drag-and-drop reordering (visual feedback)
 * - Context menu actions
 * - Active note highlighting
 * - Badge showing child count
 * - Smooth animations
 * - Keyboard navigation
 * - Empty states
 */

interface NoteTreeProps {
  onSelectNote?: (noteId: number) => void;
  onCreateNote?: (parentId: number | null) => void;
  onEditNote?: (note: NoteTreeNode) => void;
  onDeleteNote?: (noteId: number) => void;
  selectedNoteId?: number | null;
}

export function NoteTree({
  onSelectNote,
  onCreateNote,
  onEditNote,
  onDeleteNote,
  selectedNoteId,
}: NoteTreeProps) {
  const { tree, isLoading } = useNoteTree();
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [draggedNode, setDraggedNode] = useState<number | null>(null);

  const toggleNode = (nodeId: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // Expand all parent nodes when selecting a note
  const expandToNode = (nodeId: number) => {
    const path = getPathToNode(tree, nodeId);
    const newExpanded = new Set(expandedNodes);
    path.forEach((node) => {
      if (node.children && node.children.length > 0) {
        newExpanded.add(node.id);
      }
    });
    setExpandedNodes(newExpanded);
  };

  // Get path from root to node
  const getPathToNode = (
    nodes: NoteTreeNode[],
    targetId: number,
  ): NoteTreeNode[] => {
    const path: NoteTreeNode[] = [];

    const findPath = (nodes: NoteTreeNode[], targetId: number): boolean => {
      for (const node of nodes) {
        path.push(node);
        if (node.id === targetId) return true;

        if (node.children && node.children.length > 0) {
          if (findPath(node.children, targetId)) return true;
        }

        path.pop();
      }
      return false;
    };

    findPath(nodes, targetId);
    return path;
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-12 w-12" />}
        title="No notes yet"
        description="Create your first note to start organizing your knowledge"
        action={
          onCreateNote
            ? {
                label: "Create Note",
                onClick: () => onCreateNote(null),
              }
            : undefined
        }
        variant="no-data"
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-1"
    >
      <AnimatePresence>
        {tree.map((node, index) => (
          <TreeNode
            key={node.id}
            node={node}
            level={0}
            index={index}
            expandedNodes={expandedNodes}
            selectedNoteId={selectedNoteId}
            draggedNode={draggedNode}
            onToggle={toggleNode}
            onSelect={onSelectNote}
            onCreate={onCreateNote}
            onEdit={onEditNote}
            onDelete={onDeleteNote}
            onDragStart={() => setDraggedNode(node.id)}
            onDragEnd={() => setDraggedNode(null)}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Recursive Tree Node Component
 */
interface TreeNodeProps {
  node: NoteTreeNode;
  level: number;
  index: number;
  expandedNodes: Set<number>;
  selectedNoteId?: number | null;
  draggedNode: number | null;
  onToggle: (nodeId: number) => void;
  onSelect?: (noteId: number) => void;
  onCreate?: (parentId: number | null) => void;
  onEdit?: (note: NoteTreeNode) => void;
  onDelete?: (noteId: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

function TreeNode({
  node,
  level,
  index,
  expandedNodes,
  selectedNoteId,
  draggedNode,
  onToggle,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
}: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedNoteId === node.id;
  const isDragging = draggedNode === node.id;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(isDragging && "opacity-50")}
    >
      {/* Node Row */}
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1.5 rounded-md transition-all duration-200",
          "hover:bg-accent cursor-pointer group",
          isSelected && "bg-accent ring-2 ring-primary/20",
          isDragging && "opacity-50 cursor-grabbing",
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {/* Drag Handle */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="p-0.5 hover:bg-accent-foreground/10 rounded transition-colors"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="h-4 w-4" />
            </motion.div>
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Icon */}
        <motion.div
          whileHover={{ scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          {hasChildren ? (
            isExpanded ? (
              <FolderOpen className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            ) : (
              <Folder className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            )
          ) : (
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-500" />
          )}
        </motion.div>

        {/* Title */}
        <span
          className="flex-1 text-sm truncate hover:text-primary transition-colors"
          onClick={() => onSelect?.(node.id)}
        >
          {node.title}
        </span>

        {/* Child Count Badge */}
        {hasChildren && (
          <Badge variant="secondary" className="text-xs h-5 px-1.5">
            {node.children!.length}
          </Badge>
        )}

        {/* Actions Menu */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSelect?.(node.id)}>
                <FileText className="h-4 w-4 mr-2" />
                Open Note
              </DropdownMenuItem>
              {onCreate && (
                <DropdownMenuItem onClick={() => onCreate(node.id)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Child Note
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(node)}>
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(node.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Children */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {node.children!.map((child, childIndex) => (
              <TreeNode
                key={child.id}
                node={child}
                level={level + 1}
                index={childIndex}
                expandedNodes={expandedNodes}
                selectedNoteId={selectedNoteId}
                draggedNode={draggedNode}
                onToggle={onToggle}
                onSelect={onSelect}
                onCreate={onCreate}
                onEdit={onEdit}
                onDelete={onDelete}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
