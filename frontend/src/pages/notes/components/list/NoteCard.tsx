/**
 * NEXT-LEVEL Note Card  
 * Premium design with hover effects, visual depth, and smart interactions
 */

import { motion } from 'framer-motion';
import { FileText, Clock, MoreVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NoteCardProps {
    note: {
        id: number;
        title: string;
        content: string;
        updated_at: string;
        tags?: any[];
    };
    onClick: () => void;
    index: number;
}

export const NoteCard = ({ note, onClick, index }: NoteCardProps) => {

    // Get color accent based on first tag or default
    const getAccentColor = (): { primary: string; light: string } => {
        const colorPalette = [
            { primary: '#8b5cf6', light: '#8b5cf615' }, // purple
            { primary: '#ec4899', light: '#ec489915' }, // pink
            { primary: '#f59e0b', light: '#f59e0b15' }, // amber
            { primary: '#10b981', light: '#10b98115' }, // emerald
            { primary: '#3b82f6', light: '#3b82f615' }, // blue
            { primary: '#ef4444', light: '#ef444415' }, // red
        ];

        if (!note.tags || note.tags.length === 0) {
            return { primary: '#6366f1', light: '#6366f115' }; // default indigo
        }

        const hash = note.tags[0]?.name?.charCodeAt(0) || 0;
        return colorPalette[hash % colorPalette.length] ?? { primary: '#6366f1', light: '#6366f115' };
    };

    // Extract preview text
    const getPreview = () => {
        const text = note.content
            .replace(/[#*`_\[\]]/g, '')
            .replace(/\n+/g, ' ')
            .trim();
        return text.length > 200 ? text.substring(0, 200) + '...' : text;
    };

    const wordCount = note.content?.split(/\s+/).length || 0;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));
    const colors = getAccentColor();  // Always returns a valid color object

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, type: 'spring', stiffness: 300 }}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            onClick={onClick}
            className="group relative cursor-pointer"
        >
            {/* Hover glow effect */}
            <div
                className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"
                style={{ background: `linear-gradient(135deg, ${colors.primary}20, transparent)` }}
            />

            {/* Card */}
            <div className="relative bg-card border border-border rounded-2xl p-6 transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-xl overflow-hidden">
                {/* Top accent bar */}
                <div
                    className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                        background: `linear-gradient(90deg, ${colors.primary}, transparent)`,
                    }}
                />

                {/* Header: Tags and Menu */}
                <div className="flex items-start justify-between mb-3">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5">
                        {note.tags && note.tags.length > 0 ? (
                            note.tags.slice(0, 2).map((tag: any, i: number) => (
                                <span
                                    key={i}
                                    className="px-2 py-1 text-xs font-medium rounded-lg transition-colors"
                                    style={{
                                        backgroundColor: colors.light,
                                        color: colors.primary,
                                    }}
                                >
                                    {tag.name || tag}
                                </span>
                            ))
                        ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-lg">
                                Untagged
                            </span>
                        )}
                        {note.tags && note.tags.length > 2 && (
                            <span className="px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-lg">
                                +{note.tags.length - 2}
                            </span>
                        )}
                    </div>

                    {/* More menu */}
                    <button
                        className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-accent rounded-lg transition-all"
                        onClick={(e) => {
                            e.stopPropagation();
                            // Could open menu here
                        }}
                    >
                        <MoreVertical size={16} className="text-muted-foreground" />
                    </button>
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {note.title || 'Untitled Note'}
                </h3>

                {/* Content Preview */}
                {note.content && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3 leading-relaxed">
                        {getPreview()}
                    </p>
                )}

                {/* Footer: Metadata */}
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {/* Last updated */}
                        <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>{formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}</span>
                        </div>

                        {/* Word count */}
                        <div className="hidden sm:flex items-center gap-1">
                            <FileText size={12} />
                            <span>{wordCount} words</span>
                        </div>
                    </div>

                    {/* Read time badge */}
                    <div className="flex items-center gap-1 px-2 py-1 bg-accent rounded-lg text-xs font-medium text-foreground">
                        {readTime} min read
                    </div>
                </div>

                {/* Animated corner accent (visible on hover) */}
                <div
                    className={`absolute bottom-0 right-0 w-24 h-24 rounded-tl-full opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                    style={{ backgroundColor: colors.primary }}
                />
            </div>
        </motion.div>
    );
};
