import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnhancedDocument } from '../../types/documents.types';

interface DocumentCardProps {
    doc: EnhancedDocument;
    index: number;
    onSelect: (doc: EnhancedDocument) => void;
    onDelete: () => void;
    logAction: (msg: string) => void;
}

/**
 * FileIcon Component - Simple file type icon
 */
const FileIcon: React.FC<{ type: string; className?: string }> = ({ type, className }) => {
    return (
        <svg
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        </svg>
    );
};

/**
 * Data Monolith - 3D card display for documents
 */
export const DocumentCard = React.forwardRef<HTMLDivElement, DocumentCardProps>(
    ({ doc, index, onSelect, onDelete, logAction }, ref) => {
        return (
            <motion.div
            ref={ref}
            layoutId={`monolith-${doc.id}`}
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', damping: 20, delay: index * 0.05 }}
            onClick={() => {
                onSelect(doc);
                logAction(`FOCUS LOCK: ${doc.filename}`);
            }}
            className="group relative w-full aspect-[3/4] cursor-pointer perspective-1000"
            >
            <div className="absolute inset-0 bg-[#050505]/80 backdrop-blur-md border border-white/10 rounded-xl transition-all duration-500 group-hover:transform group-hover:-translate-y-4 group-hover:shadow-[0_20px_40px_rgba(6,182,212,0.2)] group-hover:border-cyan-500/50 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-50" />
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10 p-5 h-full flex flex-col items-center justify-between text-center">
            {/* Header */}
            <div className="w-full flex justify-between items-start opacity-50 group-hover:opacity-100 transition-opacity">
            <div className="text-[9px] font-mono text-cyan-400 border border-cyan-500/30 px-1 rounded">
            {doc.sector.substring(0, 3).toUpperCase()}
            </div>
            {doc.processing_status === 'completed' && <Lock size={10} className="text-emerald-400" />}
            {doc.processing_status === 'processing' && (
                <Loader2 size={10} className="text-amber-400 animate-spin" />
            )}
            </div>

            {/* Icon */}
            <motion.div
            className="p-4 rounded-2xl bg-black/40 border border-white/5 shadow-inner group-hover:shadow-cyan-500/20 group-hover:border-cyan-500/30 transition-all"
            whileHover={{ rotate: [0, -5, 5, 0] }}
            >
            <FileIcon
            type={doc.type}
            className={cn(
                'w-10 h-10 transition-colors duration-300',
                doc.processing_status === 'processing'
                ? 'text-amber-400 animate-pulse'
                : 'text-slate-400 group-hover:text-cyan-400'
            )}
            />
            </motion.div>

            {/* Footer */}
            <div className="w-full">
            <h3 className="text-xs font-bold text-slate-300 group-hover:text-white truncate font-mono tracking-wide">
            {doc.filename}
            </h3>
            <div className="h-0.5 w-8 bg-white/10 mx-auto mt-3 rounded-full overflow-hidden group-hover:w-full transition-all duration-500">
            <div
            className={cn(
                'h-full w-full',
                doc.processing_status === 'processing'
                ? 'bg-amber-500 animate-progress'
                : 'bg-cyan-500'
            )}
            />
            </div>
            </div>
            </div>
            </div>

            {/* Glow Effect */}
            <div className="absolute -bottom-8 left-4 right-4 h-4 bg-cyan-500/20 blur-xl rounded-[100%] opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform scale-x-150" />
            </motion.div>
        );
    }
);

DocumentCard.displayName = 'DocumentCard';
