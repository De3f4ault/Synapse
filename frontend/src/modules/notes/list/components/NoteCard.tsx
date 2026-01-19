/**
 * Notes Module - NoteCard Component
 * Grid card for note display with preview and metadata.
 * Uses DocMeta from local workspace.
 *
 * ============================================================================
 * ARCHITECTURE: LOCAL-FIRST (Phase 1)
 * ============================================================================
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Clock, Trash2, MoreVertical, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { GlassCard } from "@/shared/ui";
import { Button } from "@/components/ui/button";
import type { DocMeta } from "../../engine/blocksuiteStore";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

// ============================================================================
// Types
// ============================================================================

interface NoteCardProps {
    note: DocMeta;
    onClick: () => void;
    onDelete?: (id: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export const NoteCard = ({ note, onClick, onDelete }: NoteCardProps) => {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Get color accent based on first tag or default
    const getAccentClass = (): string => {
        const colorPalettes = [
            "text-purple-400 bg-purple-500/10 border-purple-500/20",
            "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
            "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
            "text-amber-400 bg-amber-500/10 border-amber-500/20",
            "text-blue-400 bg-blue-500/10 border-blue-500/20",
            "text-red-400 bg-red-500/10 border-red-500/20",
        ];

        const tags = note.tags || [];
        const defaultClass = colorPalettes[4] ?? "text-blue-400 bg-blue-500/10 border-blue-500/20";
        if (tags.length === 0) {
            return defaultClass;
        }

        const hash = tags[0]?.charCodeAt(0) || 0;
        return colorPalettes[hash % colorPalettes.length] ?? defaultClass;
    };

    // Handle delete with confirmation
    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            onDelete?.(note.id);
            toast.success("Note deleted successfully");
            setShowDeleteDialog(false);
        } catch (error) {
            console.error("[NoteCard] Failed to delete note:", error);
            toast.error("Failed to delete note");
        } finally {
            setIsDeleting(false);
        }
    };

    const wordCount = note.preview?.split(/\s+/).filter(Boolean).length || 0;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));
    const accentClass = getAccentClass();
    const tags = note.tags || [];

    return (
        <>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className="group cursor-pointer h-full relative"
            >
                <GlassCard className="h-full p-6 flex flex-col relative overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[50px] rounded-full group-hover:bg-cyan-500/20 transition-all duration-500" />

                    {/* Header: Tags + Menu */}
                    <div className="flex items-start justify-between mb-4 relative z-10">
                        <div className="flex flex-wrap gap-1.5 flex-1" onClick={onClick}>
                            {tags.length > 0 ? (
                                tags.slice(0, 2).map((tag, i) => (
                                    <span
                                        key={i}
                                        className={`text-[10px] h-5 px-2 py-0.5 rounded-full border ${accentClass}`}
                                    >
                                        {tag}
                                    </span>
                                ))
                            ) : (
                                <span className="px-2 py-[2px] text-[10px] font-medium bg-white/5 text-slate-500 rounded-full border border-white/5">
                                    Untagged
                                </span>
                            )}
                            {tags.length > 2 && (
                                <span className="px-2 py-[2px] text-[10px] font-medium bg-white/5 text-slate-500 rounded-full border border-white/5">
                                    +{tags.length - 2}
                                </span>
                            )}
                        </div>

                        {/* Dropdown Menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreVertical size={16} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent 
                                align="end" 
                                className="bg-zinc-900 border-white/10"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <DropdownMenuItem
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                                    onClick={() => setShowDeleteDialog(true)}
                                >
                                    <Trash2 size={14} className="mr-2" />
                                    Delete Note
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Title (Clickable) */}
                    <h3 
                        onClick={onClick}
                        className="relative z-10 text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-cyan-300 transition-colors"
                    >
                        {note.title || "Untitled Note"}
                    </h3>

                    {/* Content Preview (Clickable) */}
                    <div className="flex-1 relative z-10" onClick={onClick}>
                        {note.preview && (
                            <p className="text-sm text-slate-400 mb-4 line-clamp-3 leading-relaxed">
                                {note.preview}
                            </p>
                        )}
                    </div>

                    {/* Footer: Metadata */}
                    <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/5 mt-auto" onClick={onClick}>
                        <div className="flex items-center gap-3 text-xs text-slate-600 font-mono">
                            <div className="flex items-center gap-1.5">
                                <Clock size={12} />
                                <span>
                                    {formatDistanceToNow(new Date(note.updatedDate), {
                                        addSuffix: true,
                                    })}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-cyan-500/80 bg-cyan-500/10 px-2 py-1 rounded-md border border-cyan-500/10">
                            <FileText size={10} />
                            {readTime} min
                        </div>
                    </div>
                </GlassCard>
            </motion.div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="text-red-400" size={20} />
                            Delete Note
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Are you sure you want to delete "{note.title || "Untitled Note"}"? 
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="ghost"
                            onClick={() => setShowDeleteDialog(false)}
                            disabled={isDeleting}
                            className="border-white/10 text-white hover:bg-white/10"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-red-500/20 text-red-400 border border-red-500/20 hover:bg-red-500/30"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
