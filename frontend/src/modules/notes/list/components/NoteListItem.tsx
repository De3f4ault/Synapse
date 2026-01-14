import { motion } from "framer-motion";
import { FileText, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { NoteResponse } from "../../core";

interface NoteListItemProps {
    note: NoteResponse;
    onClick: () => void;
}

export const NoteListItem = ({ note, onClick }: NoteListItemProps) => {


    const wordCount = note.content?.split(/\s+/).length || 0;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));
    const tags = (note as any).tags || [];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onClick}
            className="group flex items-center gap-6 p-4 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all cursor-pointer"
        >
            <div className="p-3 rounded-lg bg-white/5 text-cyan-400 group-hover:scale-110 transition-transform">
                <FileText size={20} />
            </div>

            <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                    {note.title || "Untitled Note"}
                </h3>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                     <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>
                            {formatDistanceToNow(new Date(note.updated_at), {
                                addSuffix: true,
                            })}
                        </span>
                    </div>
                    <span>•</span>
                    <span>{readTime} min read</span>
                </div>
            </div>

            <div className="hidden md:flex gap-2">
                {tags.slice(0, 3).map((tag: any) => (
                    <span key={tag.id || tag.name} className="px-2 py-1 rounded bg-black/20 text-xs text-slate-500 border border-white/5">
                        {tag.name || tag}
                    </span>
                ))}
            </div>
        </motion.div>
    );
};
