import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Copy, Replace, FileText, Calendar, HardDrive } from 'lucide-react';
import { format } from 'date-fns';

interface ConflictInfo {
    conflict_type: 'exact_duplicate' | 'same_content' | 'same_filename';
    existing_document_id: number;
    existing_filename: string;
    existing_file_size: number;
    existing_uploaded_at: string;
    message: string;
}

interface DuplicateConflictModalProps {
    isOpen: boolean;
    onClose: () => void;
    conflict: ConflictInfo | null;
    newFile: File | null;
    onReplace: () => void;
    onKeepBoth: () => void;
    isSubmitting?: boolean;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DuplicateConflictModal({
    isOpen,
    onClose,
    conflict,
    newFile,
    onReplace,
    onKeepBoth,
    isSubmitting = false,
}: DuplicateConflictModalProps) {
    if (!isOpen || !conflict) return null;

    const conflictTitles: Record<string, string> = {
        exact_duplicate: 'Exact Duplicate Detected',
        same_content: 'Same Content Detected',
        same_filename: 'Filename Already Exists',
    };

    const conflictIcons: Record<string, React.ReactNode> = {
        exact_duplicate: <Copy className="w-5 h-5" />,
        same_content: <Copy className="w-5 h-5" />,
        same_filename: <FileText className="w-5 h-5" />,
    };

    // For exact duplicates, don't offer "Keep Both" since content is identical
    const showKeepBoth = conflict.conflict_type !== 'exact_duplicate';

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-popover border border-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center gap-3 p-6 border-b border-border">
                        <div className="w-10 h-10 rounded-xl bg-warning/20 text-warning flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">
                                {conflictTitles[conflict.conflict_type]}
                            </h2>
                            <p className="text-sm text-muted-foreground">{conflict.message}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="ml-auto p-2 hover:bg-muted/50 rounded-full transition-colors"
                        >
                            <X size={18} className="text-muted-foreground" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        {/* Existing Document Info */}
                        <div className="p-4 bg-foreground/5 rounded-xl border border-border">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                                {conflictIcons[conflict.conflict_type]}
                                <span>Existing Document</span>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Filename</span>
                                    <span className="text-foreground font-medium truncate max-w-[200px]">
                                        {conflict.existing_filename}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <HardDrive size={12} /> Size
                                    </span>
                                    <span className="text-foreground/80">
                                        {formatFileSize(conflict.existing_file_size)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <Calendar size={12} /> Uploaded
                                    </span>
                                    <span className="text-foreground/80">
                                        {format(new Date(conflict.existing_uploaded_at), 'MMM d, yyyy HH:mm')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* New File Info */}
                        {newFile && (
                            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                                <div className="flex items-center gap-2 text-sm text-primary mb-3">
                                    <FileText size={14} />
                                    <span>New File</span>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Filename</span>
                                        <span className="text-foreground font-medium truncate max-w-[200px]">
                                            {newFile.name}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Size</span>
                                        <span className="text-foreground/80">{formatFileSize(newFile.size)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="p-6 border-t border-border space-y-3">
                        {/* Replace */}
                        <button
                            onClick={onReplace}
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-600 hover:bg-warning text-foreground font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Replace size={18} />
                            Replace Existing Document
                        </button>

                        {/* Keep Both */}
                        {showKeepBoth && (
                            <button
                                onClick={onKeepBoth}
                                disabled={isSubmitting}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-foreground/5 border border-border hover:bg-muted text-foreground font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Copy size={18} />
                                Keep Both (Auto-rename)
                            </button>
                        )}

                        {/* Cancel */}
                        <button
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="w-full py-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
                        >
                            Cancel Upload
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
