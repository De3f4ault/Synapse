import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnhancedDocument } from '../../types/documents.types';

interface DocumentCardProps {
    doc: EnhancedDocument;
    index: number;
    onSelect: (doc: EnhancedDocument) => void;
    // onDelete was unused
    logAction: (msg: string) => void;
}

/**
 * FileIcon Component - Simple file type icon
 */
const FileIcon: React.FC<{ type: string; className?: string }> = ({ type: _type, className }) => {
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
    ({ doc, index, onSelect, logAction }, ref) => {
        return (
            <motion.div
                ref={ref}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={() => {
                    onSelect(doc);
                    logAction(`FOCUS LOCK: ${doc.filename}`);
                }}
                className="synapse-panel group relative w-full aspect-[3/4] cursor-pointer overflow-hidden p-6 flex flex-col justify-between hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all duration-300 hover:-translate-y-1"
            >

                {/* Header */}
                <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                        {doc.sector.substring(0, 3).toUpperCase()}
                    </span>
                    {doc.processing_status === 'processing' && <Loader2 size={12} className="text-amber-400 animate-spin" />}
                </div>

                {/* Icon */}
                <div className="flex justify-center my-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 group-hover:scale-110 transition-transform duration-300">
                        <FileIcon type={doc.type} className={cn("w-10 h-10 text-slate-400 group-hover:text-cyan-400 transition-colors", doc.processing_status === 'processing' && "animate-pulse text-amber-400")} />
                    </div>
                </div>

                {/* Footer */}
                <div>
                    <h3 className="text-xs font-bold text-slate-200 group-hover:text-white truncate font-mono text-center mb-2">
                        {doc.filename}
                    </h3>
                    {doc.processing_status === 'processing' ? (
                        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 animate-progress" />
                        </div>
                    ) : (
                        <div className="h-1 w-8 mx-auto bg-cyan-500/50 rounded-full group-hover:w-full transition-all duration-500" />
                    )}
                </div>

            </motion.div>
        );
    }
);

DocumentCard.displayName = 'DocumentCard';
