import { motion } from 'framer-motion';
import { FileText, Clock, MoreVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { NeumorphicCard, NeumorphicBadge } from '@/components/neumorphic';

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
    const getAccentColor = (): 'purple' | 'cyan' | 'emerald' | 'coral' | 'red' | 'blue' => {
        const colorPalette: Array<'purple' | 'cyan' | 'emerald' | 'coral' | 'red' | 'blue'> = [
            'purple', 'cyan', 'coral', 'emerald', 'blue', 'red'
        ];

        if (!note.tags || note.tags.length === 0) {
            return 'blue';
        }

        const hash = note.tags[0]?.name?.charCodeAt(0) || 0;
        return colorPalette[hash % colorPalette.length];
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
    const variant = getAccentColor();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, type: 'spring', stiffness: 300 }}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            onClick={onClick}
            className="group relative cursor-pointer h-full"
        >
            <NeumorphicCard
                className="h-full flex flex-col p-6 transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.1)] border-transparent group-hover:border-white/10"
            >
                {/* Header: Tags and Menu */}
                <div className="flex items-start justify-between mb-4">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5">
                        {note.tags && note.tags.length > 0 ? (
                            note.tags.slice(0, 2).map((tag: any, i: number) => (
                                <NeumorphicBadge
                                    key={i}
                                    variant={variant}
                                    className="text-[10px] h-5 px-2"
                                >
                                    {tag.name || tag}
                                </NeumorphicBadge>
                            ))
                        ) : (
                            <span className="px-2 py-[2px] text-[10px] font-medium bg-white/5 text-slate-500 rounded-full border border-white/5">
                                Untagged
                            </span>
                        )}
                        {note.tags && note.tags.length > 2 && (
                            <span className="px-2 py-[2px] text-[10px] font-medium bg-white/5 text-slate-500 rounded-full border border-white/5">
                                +{note.tags.length - 2}
                            </span>
                        )}
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-slate-200 mb-3 line-clamp-2 group-hover:text-white transition-colors">
                    {note.title || 'Untitled Note'}
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
                            <span>{formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}</span>
                        </div>
                    </div>

                    {/* Read time badge */}
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-cyan-500/80 bg-cyan-500/10 px-2 py-1 rounded-md border border-cyan-500/10">
                        <FileText size={10} />
                        {readTime} min
                    </div>
                </div>
            </NeumorphicCard>
        </motion.div>
    );
};
