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
    Calendar,
    SkipForward,
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
    queued: { icon: FileText, color: 'text-muted-foreground', bg: 'bg-muted/30', progressGradient: 'from-muted-foreground to-muted-foreground' },
    uploading: { icon: Loader2, color: 'text-primary', bg: 'bg-primary/10', progressGradient: 'from-primary via-primary/80 to-primary/60' },
    success: { icon: Check, color: 'text-accent-olive', bg: 'bg-accent-olive/10', progressGradient: 'from-emerald-500 to-green-400' },
    skipped: { icon: SkipForward, color: 'text-muted-foreground', bg: 'bg-muted/20', progressGradient: 'from-muted-foreground to-muted-foreground' },
    conflict: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10', progressGradient: 'from-amber-500 to-orange-400' },
    error: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', progressGradient: 'from-red-500 to-rose-400' },
};

export function UploadQueueItem({
    item,
    onReplace,
    onKeepBoth,
    onSkip,
    onRemove,
    isProcessing = false,
}: UploadQueueItemProps) {
    const config = statusConfig[item.status] ?? statusConfig.queued;
    const StatusIcon = config.icon;
    // Only offer "Keep Both" when content differs (same_filename type)
    const showKeepBoth = item.conflict?.conflict_type === 'same_filename';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={cn(
                "p-3 rounded-xl border transition-all relative overflow-hidden",
                config.bg,
                item.status === 'conflict' ? 'border-amber-500/30' : 'border-border',
                item.status === 'success' && 'border-accent-olive/20'
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
                    <p className="text-sm font-medium text-foreground truncate">
                        {item.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {formatFileSize(item.file.size)}
                    </p>
                </div>

                {/* Progress / Status */}
                {item.status === 'uploading' && (
                    <div className="w-24">
                        <div className="h-1.5 bg-foreground/5 rounded-full overflow-hidden relative">
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
                        <p className="text-xs text-muted-foreground text-right mt-0.5 tabular-nums">
                            {item.progress}%
                        </p>
                    </div>
                )}

                {/* Remove Button (for non-conflict states) */}
                {item.status !== 'conflict' && (
                    <button
                        onClick={onRemove}
                        className="p-1.5 hover:bg-muted/50 rounded-lg transition-colors"
                    >
                        <X size={14} className="text-muted-foreground" />
                    </button>
                )}
            </div>

            {/* Conflict Resolution — only for same_filename (user must decide) */}
            {item.status === 'conflict' && item.conflict && (
                <div className="mt-3 pt-3 border-t border-border">
                    {/* Existing Document Info */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
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
                    <p className="text-xs text-warning/80 mb-3">
                        {item.conflict.message}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onReplace}
                            disabled={isProcessing}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-600 hover:bg-warning text-foreground text-xs font-medium transition-colors disabled:opacity-50"
                        >
                            <Replace size={12} />
                            Replace
                        </button>

                        {showKeepBoth && (
                            <button
                                onClick={onKeepBoth}
                                disabled={isProcessing}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-foreground/5 border border-border hover:bg-muted text-foreground text-xs font-medium transition-colors disabled:opacity-50"
                            >
                                <Copy size={12} />
                                Keep Both
                            </button>
                        )}

                        <button
                            onClick={onSkip}
                            disabled={isProcessing}
                            className="py-2 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                            Skip
                        </button>
                    </div>
                </div>
            )}

            {/* Skipped label (auto-resolved) */}
            {item.status === 'skipped' && item.conflict && (
                <p className="mt-2 text-xs text-muted-foreground/70 italic">
                    Already in library — skipped automatically
                </p>
            )}

            {/* Error Message */}
            {item.status === 'error' && item.error && (
                <p className="mt-2 text-xs text-destructive">
                    {item.error}
                </p>
            )}
        </motion.div>
    );
}
