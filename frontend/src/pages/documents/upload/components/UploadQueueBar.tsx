/**
 * UploadQueueBar — Floating upload tray (bottom-right)
 *
 * Shows active queue items and, when all processing is done,
 * transitions to a Session Summary card.
 */

import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronUp, X, Loader2, Check, Upload,
    SkipForward, AlertTriangle, FileText, CheckCircle2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useUploadStore } from "../state/uploadStore";
import { UploadQueueItem } from "./UploadQueueItem";

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
    const session = useUploadStore((s) => s.session);
    const removeFromQueue = useUploadStore((s) => s.removeFromQueue);
    const clearQueue = useUploadStore((s) => s.clearQueue);
    const clearCompleted = useUploadStore((s) => s.clearCompleted);
    const clearSession = useUploadStore((s) => s.clearSession);

    // Auto-collapse queue list once all done (session summary takes over)
    useEffect(() => {
        if (session) {
            setIsExpanded(false);
        }
    }, [session]);

    // Auto-expand when new items arrive
    useEffect(() => {
        if (queue.some((i) => i.status === "queued" || i.status === "uploading")) {
            setIsExpanded(true);
        }
    }, [queue.length]); // eslint-disable-line react-hooks/exhaustive-deps

    const successCount = queue.filter((i) => i.status === "success").length;
    const skippedCount = queue.filter((i) => i.status === "skipped").length;
    const conflictCount = queue.filter((i) => i.status === "conflict").length;
    const uploadingCount = queue.filter((i) => i.status === "uploading").length;
    const errorCount = queue.filter((i) => i.status === "error").length;
    const queuedCount = queue.filter((i) => i.status === "queued").length;
    const totalCount = queue.length;
    const doneCount = successCount + skippedCount + errorCount;

    // Nothing to show
    if (totalCount === 0 && !session) return null;

    // Progress percentage (for header bar)
    const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 100;

    const getHeaderText = () => {
        if (session) return "Upload complete";
        if (conflictCount > 0)
            return `${conflictCount} file${conflictCount === 1 ? "" : "s"} need attention`;
        if (uploadingCount > 0)
            return `Uploading ${uploadingCount + queuedCount} file${uploadingCount + queuedCount === 1 ? "" : "s"}…`;
        return `${totalCount} file${totalCount === 1 ? "" : "s"} in queue`;
    };

    const getSubText = () => {
        if (session) return null;
        return `${doneCount}/${totalCount} processed`;
    };

    // ─── Session Summary Card ────────────────────────────────────────────────
    if (session && queue.length === 0) {
        return (
            <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.95 }}
                className="fixed bottom-6 right-6 z-50 w-[360px]"
            >
                <div className="bg-popover backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-accent-olive/20 flex items-center justify-center">
                                <CheckCircle2 size={16} className="text-accent-olive" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-foreground">Upload Session Complete</p>
                                <p className="text-xs text-muted-foreground">
                                    {session.totalQueued} file{session.totalQueued !== 1 ? "s" : ""} processed
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={clearSession}
                            className="p-1.5 hover:bg-muted/50 rounded-lg transition-colors"
                        >
                            <X size={14} className="text-muted-foreground" />
                        </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-px bg-border m-4 rounded-xl overflow-hidden border border-border">
                        <StatCell
                            icon={<Check size={14} className="text-accent-olive" />}
                            label="Uploaded"
                            value={session.uploaded}
                            accent="emerald"
                        />
                        <StatCell
                            icon={<SkipForward size={14} className="text-muted-foreground" />}
                            label="Skipped (duplicates)"
                            value={session.skipped}
                            accent="slate"
                        />
                        <StatCell
                            icon={<AlertTriangle size={14} className="text-amber-400" />}
                            label="Need attention"
                            value={session.conflicts}
                            accent="amber"
                        />
                        <StatCell
                            icon={<X size={14} className="text-destructive" />}
                            label="Errors"
                            value={session.errors}
                            accent="red"
                        />
                    </div>

                    {/* CTA */}
                    <div className="px-4 pb-4">
                        <button
                            onClick={clearSession}
                            className="w-full py-2 rounded-lg bg-accent-olive/15 hover:bg-accent-olive/25 text-accent-olive text-sm font-medium border border-emerald-800/30 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    }

    // ─── Active Queue Bar ────────────────────────────────────────────────────
    return (
        <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[420px]"
        >
            <div className="bg-popover backdrop-blur-xl border border-border rounded-2xl shadow-2xl shadow-violet-900/10 overflow-hidden">
                {/* ── Header ── */}
                <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center gap-3">
                        {/* Status Icon */}
                        <div
                            className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center ring-1 ring-white/5",
                                conflictCount > 0
                                    ? "bg-warning/20"
                                    : uploadingCount > 0
                                        ? "bg-violet-500/20"
                                        : session
                                            ? "bg-accent-olive/20"
                                            : "bg-slate-500/20"
                            )}
                        >
                            {uploadingCount > 0 ? (
                                <Loader2 size={16} className="text-violet-400 animate-spin" />
                            ) : conflictCount > 0 ? (
                                <AlertTriangle size={16} className="text-warning" />
                            ) : session ? (
                                <Check size={16} className="text-accent-olive" />
                            ) : (
                                <Upload size={16} className="text-muted-foreground" />
                            )}
                        </div>

                        {/* Text */}
                        <div>
                            <p className="text-sm font-medium text-foreground">{getHeaderText()}</p>
                            {getSubText() && (
                                <p className="text-xs text-muted-foreground">{getSubText()}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Clear completed */}
                        {(successCount > 0 || skippedCount > 0) && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    clearCompleted();
                                }}
                                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors"
                            >
                                Clear done
                            </button>
                        )}
                        {/* Close all */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                clearQueue();
                                clearSession();
                            }}
                            className="p-1.5 hover:bg-muted/50 rounded-lg transition-colors"
                        >
                            <X size={16} className="text-muted-foreground" />
                        </button>
                        <ChevronUp
                            size={18}
                            className={cn(
                                "text-muted-foreground transition-transform",
                                isExpanded && "rotate-180"
                            )}
                        />
                    </div>
                </div>

                {/* ── Progress Bar ── */}
                {totalCount > 0 && !session && (
                    <div className="h-1 bg-foreground/5 mx-4 mb-1 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                            animate={{ width: `${progressPct}%` }}
                            transition={{ type: "spring", stiffness: 60, damping: 16 }}
                        />
                    </div>
                )}

                {/* ── Queue List ── */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="px-4 pb-4 pt-2 space-y-2 max-h-[340px] overflow-y-auto scrollbar-hide">
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
                                                        documentId:
                                                            item.conflict.existing_document_id,
                                                    });
                                                }
                                            }}
                                            onKeepBoth={() =>
                                                onKeepBothFile({ id: item.id, file: item.file })
                                            }
                                            onSkip={() => removeFromQueue(item.id)}
                                            onRemove={() => removeFromQueue(item.id)}
                                        />
                                    ))}
                                </AnimatePresence>

                                {/* Empty state while loading */}
                                {queue.length === 0 && !session && (
                                    <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                                        <FileText size={16} />
                                        <span className="text-sm">Queue empty</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

// ─── Stat Cell sub-component ─────────────────────────────────────────────────

function StatCell({
    icon,
    label,
    value,
    accent,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    accent: "emerald" | "slate" | "amber" | "red";
}) {
    const accentMap = {
        emerald: "bg-emerald-900/20",
        slate: "bg-slate-900/20",
        amber: "bg-amber-900/20",
        red: "bg-red-900/20",
    };
    return (
        <div className={cn("px-4 py-3 flex items-center gap-3 bg-card", accentMap[accent])}>
            <div className="shrink-0">{icon}</div>
            <div>
                <p className="text-lg font-bold text-foreground tabular-nums">{value}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
            </div>
        </div>
    );
}
