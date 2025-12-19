import React from 'react';
import { motion } from 'framer-motion';
import { X, Activity, Download, Trash2, CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { EnhancedDocument } from '../../types/documents.types';

interface DocumentViewerProps {
    doc: EnhancedDocument;
    onClose: () => void;
    onDelete: () => void;
    logAction: (msg: string) => void;
}

/**
 * FileIcon Component
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
 * Full-screen document inspection modal
 */
export const DocumentViewer: React.FC<DocumentViewerProps> = ({
    doc,
    onClose,
    onDelete,
    logAction,
}) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300';
            case 'processing':
                return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300';
            case 'failed':
                return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-950/30 dark:text-gray-300';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="h-4 w-4" />;
            case 'processing':
                return <Loader2 className="h-4 w-4 animate-spin" />;
            case 'failed':
                return <AlertCircle className="h-4 w-4" />;
            default:
                return <Clock className="h-4 w-4" />;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-12">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal */}
            <motion.div
                className="relative w-full max-w-5xl h-[80vh] bg-[#050505] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row pointer-events-auto"
            >
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 h-16 border-b border-white/5 flex items-center justify-between px-6 bg-black/40 z-20">
                    <div className="flex items-center gap-3">
                        <Activity size={16} className="text-cyan-400" />
                        <span className="text-xs font-mono text-cyan-400 tracking-[0.2em]">ARTIFACT INSPECTION</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Left: Preview or Data DNA */}
                <div className="w-full md:w-2/3 h-full relative flex items-center justify-center bg-black/40 overflow-hidden">
                    {/* Grid Pattern Background */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />

                    {['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(doc.type.toLowerCase()) ? (
                        // Image Preview
                        <img
                            src={`/api/v1/documents/${doc.id}/content`}
                            alt={doc.filename}
                            className="max-w-[90%] max-h-[90%] object-contain rounded-lg shadow-2xl border border-white/10"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                logAction('PREVIEW: FAILED');
                            }}
                        />
                    ) : (
                        // Data DNA Visualization (Techy Fallback)
                        <div className="relative w-full h-full flex items-center justify-center">
                            <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                                <div className="w-[600px] h-[600px] bg-cyan-500/20 blur-[100px] rounded-full" />
                            </div>

                            <div className="relative z-10 grid grid-cols-8 gap-2 p-8 font-mono text-[10px] text-cyan-500/40 select-none">
                                {Array.from({ length: 192 }).map((_, i) => (
                                    <div key={i} className={cn(
                                        "w-8 h-4 flex items-center justify-center border border-cyan-500/5 rounded bg-black/20",
                                        i % 7 === 0 && "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
                                        i % 13 === 0 && "text-purple-400 bg-purple-500/10 border-purple-500/20",
                                    )}>
                                        {Math.floor(Math.random() * 255).toString(16).padStart(2, '0').toUpperCase()}
                                    </div>
                                ))}
                            </div>

                            {/* Center Icon Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="p-8 rounded-3xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl">
                                    <FileIcon type={doc.type} className="w-16 h-16 text-cyan-400" />
                                    <div className="mt-4 text-center">
                                        <div className="text-xs font-mono text-slate-400 mb-1">BINARY VIEW</div>
                                        <div className="text-[10px] text-slate-600">{doc.type.toUpperCase()} // {doc.size}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Data Terminal */}
                <div className="w-full md:w-1/3 h-full border-l border-white/10 bg-[#080808] flex flex-col">
                    <div className="flex-1 overflow-y-auto p-8 font-mono space-y-6 mt-16">
                        {/* File Info */}
                        <div>
                            <h1 className="text-xl font-bold text-white mb-2">{doc.filename}</h1>
                            <div className="flex gap-2 text-xs text-slate-500">
                                <span className="bg-white/5 px-2 py-0.5 rounded">{doc.size}</span>
                                <span className="bg-white/5 px-2 py-0.5 rounded uppercase">{doc.sector}</span>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <div className="text-[10px] text-cyan-500 uppercase tracking-widest border-b border-cyan-500/20 pb-1">
                                Status
                            </div>
                            <Badge variant="outline" className={getStatusColor(doc.processing_status)}>
                                {getStatusIcon(doc.processing_status)}
                                <span className="ml-1">{doc.processing_status}</span>
                            </Badge>
                        </div>

                        {/* Metadata */}
                        <div className="space-y-2">
                            <div className="text-[10px] text-purple-500 uppercase tracking-widest border-b border-purple-500/20 pb-1">
                                Metadata
                            </div>
                            <div className="text-xs text-slate-300 space-y-1">
                                <div>
                                    <span className="text-slate-500">Uploaded:</span>{' '}
                                    {format(new Date(doc.created_at), 'MMM d, yyyy HH:mm')}
                                </div>
                                <div>
                                    <span className="text-slate-500">Size:</span> {doc.file_size} bytes
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <button
                                onClick={() => logAction('INIT: DOWNLOAD')}
                                className="synapse-button w-full flex items-center justify-center gap-2"
                            >
                                <Download size={14} /> DOWNLOAD
                            </button>
                            <button
                                onClick={() => {
                                    onDelete();
                                    onClose();
                                }}
                                className="synapse-button w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/30"
                            >
                                <Trash2 size={14} /> DELETE
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
