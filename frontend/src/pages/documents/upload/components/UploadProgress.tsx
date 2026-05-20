import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import type { UploadProgress as UploadProgressType } from "../state/uploadStore";

interface UploadProgressProps {
    uploadProgress: UploadProgressType;
}

/**
 * Display upload progress for multiple files
 */
export const UploadProgress: React.FC<UploadProgressProps> = ({
    uploadProgress,
}) => {
    const entries = Object.entries(uploadProgress);

    if (entries.length === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 space-y-2"
            >
                {entries.map(([filename, progress]) => (
                    <div
                        key={filename}
                        className="bg-foreground/5 rounded-lg p-3 border border-border flex flex-col gap-2"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-foreground/80 truncate">
                                {filename}
                            </span>
                            <span className="text-xs text-primary">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1" />
                    </div>
                ))}
            </motion.div>
        </AnimatePresence>
    );
};
