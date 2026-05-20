/**
 * UploadModal — Full-screen dropzone overlay
 *
 * Triggered by the Upload button in DMSSidebar / toolbar.
 * Accepts files via click-to-browse or drag-and-drop.
 * Feeds directly into the FSM uploadStore via useUploadQueue dropzone.
 */

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, X, FileImage, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadModalProps {
    open: boolean;
    onClose: () => void;
    getRootProps: () => Record<string, unknown>;
    getInputProps: () => Record<string, unknown>;
    isDragActive: boolean;
    isProcessing?: boolean;
    /** Auto-close modal after files are accepted */
    closeOnDrop?: boolean;
}

const ACCEPTED_FORMATS = [
    { icon: FileText, label: "PDF", ext: ".pdf" },
    { icon: FileText, label: "DOCX", ext: ".docx" },
    { icon: FileText, label: "TXT", ext: ".txt" },
    { icon: FileCode, label: "MD", ext: ".md" },
    { icon: FileImage, label: "Images", ext: ".png .jpg" },
];

export const UploadModal: React.FC<UploadModalProps> = ({
    open,
    onClose,
    getRootProps,
    getInputProps,
    isDragActive,
    isProcessing = false,
    closeOnDrop = true,
}) => {
    // Close on Escape key
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center"
                    onClick={(e) => {
                        // Close if backdrop is clicked
                        if (e.target === e.currentTarget) onClose();
                    }}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

                    {/* Modal card */}
                    <motion.div
                        initial={{ scale: 0.95, y: 16, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.95, y: 16, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 28 }}
                        className="relative w-full max-w-lg mx-4"
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shadow-lg"
                        >
                            <X size={14} />
                        </button>

                        {/* Dropzone - wrap onDrop to also close modal */}
                        <div
                            {...getRootProps()}
                            onDropCapture={() => { if (closeOnDrop) setTimeout(onClose, 200); }}
                            className={cn(
                                "relative flex flex-col items-center justify-center gap-5",
                                "p-12 rounded-2xl border-2 border-dashed cursor-pointer",
                                "bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/40",
                                "transition-all duration-200",
                                isDragActive
                                    ? "border-emerald-500 bg-emerald-500/5 scale-[1.01]"
                                    : "border-border hover:border-emerald-700/60 hover:bg-emerald-900/5"
                            )}
                        >
                            <input
                                {...getInputProps()}
                                onChange={(e) => {
                                    // Call original onChange from getInputProps first
                                    const original = (getInputProps() as React.InputHTMLAttributes<HTMLInputElement>).onChange;
                                    original?.(e);
                                    // Then close modal if files were selected
                                    if (closeOnDrop && e.target.files && e.target.files.length > 0) {
                                        setTimeout(onClose, 250);
                                    }
                                }}
                            />

                            {/* Animated icon */}
                            <motion.div
                                animate={isDragActive
                                    ? { y: [0, -10, 0], scale: [1, 1.1, 1] }
                                    : { y: 0, scale: 1 }
                                }
                                transition={isDragActive
                                    ? { repeat: Infinity, duration: 1.2, ease: "easeInOut" }
                                    : { duration: 0.2 }
                                }
                                className={cn(
                                    "w-16 h-16 rounded-2xl flex items-center justify-center",
                                    "ring-1 ring-white/10",
                                    isDragActive
                                        ? "bg-emerald-600/20 ring-emerald-500/30"
                                        : "bg-foreground/5"
                                )}
                            >
                                <Upload
                                    size={28}
                                    className={cn(
                                        "transition-colors",
                                        isDragActive ? "text-emerald-400" : "text-muted-foreground"
                                    )}
                                />
                            </motion.div>

                            {/* Text */}
                            <div className="text-center space-y-1.5 select-none">
                                <h3 className="text-base font-semibold text-foreground">
                                    {isDragActive ? "Release to upload" : "Upload Documents"}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {isDragActive
                                        ? "Drop your files here..."
                                        : "Drag & drop files here, or click to browse"}
                                </p>
                            </div>

                            {/* Click to browse pill */}
                            {!isDragActive && (
                                <motion.div
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                        "px-5 py-2 rounded-full text-sm font-medium",
                                        "bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400",
                                        "border border-emerald-800/40 transition-colors"
                                    )}
                                >
                                    Browse files
                                </motion.div>
                            )}

                            {/* Processing indicator */}
                            {isProcessing && (
                                <p className="text-xs text-muted-foreground animate-pulse">
                                    Uploading in progress...
                                </p>
                            )}

                            {/* Accepted formats */}
                            <div className="flex items-center gap-3 mt-1">
                                {ACCEPTED_FORMATS.map(({ label }) => (
                                    <span
                                        key={label}
                                        className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60 px-1.5 py-0.5 rounded bg-foreground/5 border border-border"
                                    >
                                        {label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
