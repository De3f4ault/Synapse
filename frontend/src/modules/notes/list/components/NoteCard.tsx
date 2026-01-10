/**
 * Notes Module - NoteCard Component
 * Grid/list card for note display with preview and metadata.
 *
 * MIGRATED FROM: pages/notes/components/list/NoteCard.tsx
 */

import { motion } from "framer-motion";
import { FileText, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import GlassCard from "@/components/ui/GlassCard";
import type { NoteResponse } from "../../core";

// ============================================================================
// Types
// ============================================================================

interface NoteCardProps {
    note: NoteResponse;
    onClick: () => void;
    index: number;
}

// ============================================================================
// Component
// ============================================================================

export const NoteCard = ({ note, onClick, index }: NoteCardProps) => {
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

        const tags = (note as any).tags;
        const defaultClass = colorPalettes[4] ?? "text-blue-400 bg-blue-500/10 border-blue-500/20";
        if (!tags || tags.length === 0) {
            return defaultClass;
        }

        const hash = tags[0]?.name?.charCodeAt(0) || 0;
        return colorPalettes[hash % colorPalettes.length] ?? defaultClass;
    };

    // Extract preview text
    const getPreview = () => {
        const text = (note.content || "")
            .replace(/[#*`_\[\]]/g, "")
            .replace(/\n+/g, " ")
            .trim();
        return text.length > 200 ? text.substring(0, 200) + "..." : text;
    };

    const wordCount = note.content?.split(/\s+/).length || 0;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));
    const accentClass = getAccentClass();
    const tags = (note as any).tags || [];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, type: "spring", stiffness: 300 }}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            onClick={onClick}
            className="group relative cursor-pointer h-full"
        >
            <GlassCard
                hover
                className="h-full flex flex-col p-6 border-transparent transition-all duration-300"
            >
                {/* Header: Tags and Menu */}
                <div className="flex items-start justify-between mb-4">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5">
                        {tags.length > 0 ? (
                            tags.slice(0, 2).map((tag: any, i: number) => (
                                <span
                                    key={i}
                                    className={`text-[10px] h-5 px-2 py-0.5 rounded-full border ${accentClass}`}
                                >
                                    {tag.name || tag}
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
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-slate-200 mb-3 line-clamp-2 group-hover:text-white transition-colors">
                    {note.title || "Untitled Note"}
                </h3>

                {/* Content Preview */}
                <div className="flex-1">
                    {note.content && (
                        <p className="text-sm text-slate-500 mb-4 line-clamp-3 leading-relaxed group-hover:text-slate-400 transition-colors">
                            {getPreview()}
                        </p>
                    )}
                </div>

                {/* Footer: Metadata */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                    <div className="flex items-center gap-3 text-xs text-slate-600 font-mono">
                        {/* Last updated */}
                        <div className="flex items-center gap-1.5">
                            <Clock size={12} />
                            <span>
                                {formatDistanceToNow(new Date(note.updated_at), {
                                    addSuffix: true,
                                })}
                            </span>
                        </div>
                    </div>

                    {/* Read time badge */}
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-cyan-500/80 bg-cyan-500/10 px-2 py-1 rounded-md border border-cyan-500/10">
                        <FileText size={10} />
                        {readTime} min
                    </div>
                </div>
            </GlassCard>
        </motion.div>
    );
};
