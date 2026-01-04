import { motion } from 'framer-motion';
import {
    FileText,
    Check,
    AlertTriangle,
    XCircle,
    X,
    Replace,
    Copy,
    Loader2,
    HardDrive,
    Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { UploadItem } from '../state/uploadStore';

interface UploadQueueItemProps {
    item: UploadItem;
    onReplace: () => void;
    onKeepBoth: () => void;
    onSkip: () => void;
    onRemove: () => void;
    isProcessing?: boolean;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const statusConfig = {
    queued: { icon: FileText, color: 'text-slate-400', bg: 'bg-slate-500/10', progressGradient: 'from-slate-500 to-slate-400' },
    uploading: { icon: Loader2, color: 'text-violet-400', bg: 'bg-violet-500/10', progressGradient: 'from-violet-500 via-purple-500 to-indigo-500' },
    success: { icon: Check, color: 'text-emerald-400', bg: 'bg-emerald-500/10', progressGradient: 'from-emerald-500 to-green-400' },
    conflict: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', progressGradient: 'from-amber-500 to-orange-400' },
    error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', progressGradient: 'from-red-500 to-rose-400' },
};

export function UploadQueueItem({
    item,
    onReplace,
    onKeepBoth,
    onSkip,
    onRemove,
    isProcessing = false,
}: UploadQueueItemProps) {
    const config = statusConfig[item.status];
    const StatusIcon = config.icon;
    const isExactDuplicate = item.conflict?.conflict_type === 'exact_duplicate';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={cn(
                "p-3 rounded-xl border transition-all relative overflow-hidden",
                config.bg,
                item.status === 'conflict' ? 'border-amber-500/30' : 'border-white/5',
                item.status === 'success' && 'border-emerald-500/20'
            )}
        >
            {/* Main Row */}
            <div className="flex items-center gap-3">
                {/* Status Icon */}
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", config.bg)}>
                    <StatusIcon
                        size={16}
                        className={cn(
                            config.color,
                            item.status === 'uploading' && 'animate-spin'
                        )}
                    />
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                        {item.file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                        {formatFileSize(item.file.size)}
                    </p>
                </div>

                {/* Progress / Status */}
                {item.status === 'uploading' && (
                    <div className="w-24">
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                            {/* Gradient Progress */}
                            <motion.div
                                className={cn("h-full rounded-full bg-gradient-to-r", config.progressGradient)}
                                initial={{ width: 0 }}
                                animate={{ width: `${item.progress}%` }}
                                transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                            />
                            {/* Shimmer Effect */}
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                initial={{ x: '-100%' }}
                                animate={{ x: '100%' }}
                                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                            />
                        </div>
                        <p className="text-xs text-slate-500 text-right mt-0.5 tabular-nums">
                            {item.progress}%
                        </p>
                    </div>
                )}

                {/* Remove Button (for non-conflict states) */}
                {item.status !== 'conflict' && (
                    <button
                        onClick={onRemove}
                        className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <X size={14} className="text-slate-500" />
                    </button>
                )}
            </div>

            {/* Conflict Resolution Section */}
            {item.status === 'conflict' && item.conflict && (
                <div className="mt-3 pt-3 border-t border-white/5">
                    {/* Existing Document Info */}
                    <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                        <span className="flex items-center gap-1">
                            <FileText size={12} />
                            Existing: {item.conflict.existing_filename}
                        </span>
                        <span className="flex items-center gap-1">
                            <HardDrive size={12} />
                            {formatFileSize(item.conflict.existing_file_size)}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {format(new Date(item.conflict.existing_uploaded_at), 'MMM d')}
                        </span>
                    </div>

                    {/* Conflict Message */}
                    <p className="text-xs text-amber-400/80 mb-3">
                        {item.conflict.message}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onReplace}
                            disabled={isProcessing}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
                        >
                            <Replace size={12} />
                            Replace
                        </button>

                        {!isExactDuplicate && (
                            <button
                                onClick={onKeepBoth}
                                disabled={isProcessing}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-medium transition-colors disabled:opacity-50"
                            >
                                <Copy size={12} />
                                Keep Both
                            </button>
                        )}

                        <button
                            onClick={onSkip}
                            disabled={isProcessing}
                            className="py-2 px-3 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                            Skip
                        </button>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {item.status === 'error' && item.error && (
                <p className="mt-2 text-xs text-red-400">
                    {item.error}
                </p>
            )}
        </motion.div>
    );
}
