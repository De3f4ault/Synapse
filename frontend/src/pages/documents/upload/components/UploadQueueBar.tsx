import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, X, Loader2, Check, Upload } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useUploadStore } from '../state/uploadStore';
import { UploadQueueItem } from './UploadQueueItem';

interface UploadQueueBarProps {
    onReplaceFile: (item: { id: string; file: File; documentId: number }) => void;
    onKeepBothFile: (item: { id: string; file: File }) => void;
    isProcessing?: boolean;
}

export function UploadQueueBar({
    onReplaceFile,
    onKeepBothFile,
    isProcessing = false,
}: UploadQueueBarProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    const queue = useUploadStore((s) => s.queue);
    const removeFromQueue = useUploadStore((s) => s.removeFromQueue);
    const clearCompleted = useUploadStore((s) => s.clearCompleted);
    const clearQueue = useUploadStore((s) => s.clearQueue);

    const successCount = queue.filter((i) => i.status === 'success').length;
    const conflictCount = queue.filter((i) => i.status === 'conflict').length;
    const uploadingCount = queue.filter((i) => i.status === 'uploading').length;
    const totalCount = queue.length;

    if (totalCount === 0) return null;

    const getStatusSummary = () => {
        if (conflictCount > 0) return `${conflictCount} need${conflictCount === 1 ? 's' : ''} attention`;
        if (uploadingCount > 0) return `Uploading ${uploadingCount} file${uploadingCount === 1 ? '' : 's'}`;
        if (successCount === totalCount) return 'All uploads complete';
        return `${totalCount} file${totalCount === 1 ? '' : 's'} in queue`;
    };

    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl"
        >
            <div className="bg-[#0a0a0f]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-violet-900/10 overflow-hidden">
                {/* Header Bar */}
                <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center gap-3">
                        {/* Status Icon */}
                        <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center ring-1 ring-white/5",
                            conflictCount > 0 ? 'bg-amber-500/20' :
                                uploadingCount > 0 ? 'bg-violet-500/20' :
                                    successCount === totalCount ? 'bg-emerald-500/20' : 'bg-slate-500/20'
                        )}>
                            {uploadingCount > 0 ? (
                                <Loader2 size={16} className="text-violet-400 animate-spin" />
                            ) : conflictCount > 0 ? (
                                <Upload size={16} className="text-amber-400" />
                            ) : successCount === totalCount ? (
                                <Check size={16} className="text-emerald-400" />
                            ) : (
                                <Upload size={16} className="text-slate-400" />
                            )}
                        </div>

                        {/* Summary */}
                        <div>
                            <p className="text-sm font-medium text-white">
                                {getStatusSummary()}
                            </p>
                            <p className="text-xs text-slate-500">
                                {successCount}/{totalCount} uploaded
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Clear All */}
                        {successCount > 0 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    clearCompleted();
                                }}
                                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded transition-colors"
                            >
                                Clear done
                            </button>
                        )}

                        {/* Close All */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                clearQueue();
                            }}
                            className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <X size={16} className="text-slate-400" />
                        </button>

                        {/* Expand Toggle */}
                        <ChevronUp
                            size={18}
                            className={cn(
                                "text-slate-400 transition-transform",
                                isExpanded && "rotate-180"
                            )}
                        />
                    </div>
                </div>

                {/* Queue List */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="px-4 pb-4 space-y-2 max-h-[300px] overflow-y-auto">
                                <AnimatePresence mode="popLayout">
                                    {queue.map((item) => (
                                        <UploadQueueItem
                                            key={item.id}
                                            item={item}
                                            isProcessing={isProcessing}
                                            onReplace={() => {
                                                if (item.conflict) {
                                                    onReplaceFile({
                                                        id: item.id,
                                                        file: item.file,
                                                        documentId: item.conflict.existing_document_id
                                                    });
                                                }
                                            }}
                                            onKeepBoth={() => onKeepBothFile({ id: item.id, file: item.file })}
                                            onSkip={() => removeFromQueue(item.id)}
                                            onRemove={() => removeFromQueue(item.id)}
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
