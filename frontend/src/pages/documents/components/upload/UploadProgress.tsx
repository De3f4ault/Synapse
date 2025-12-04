import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import type { UploadProgress as UploadProgressType } from '../../types/documents.types';

interface UploadProgressProps {
    uploadProgress: UploadProgressType;
}

/**
 * Display upload progress for multiple files
 */
export const UploadProgress: React.FC<UploadProgressProps> = ({ uploadProgress }) => {
    const entries = Object.entries(uploadProgress);

    if (entries.length === 0) return null;

    return (
        <AnimatePresence>
        <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="mt-2 space-y-2"
        >
        {entries.map(([filename, progress]) => (
            <div key={filename} className="bg-black/60 rounded-lg p-2 border border-white/5">
            <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono text-slate-300 truncate">{filename}</span>
            <span className="text-xs text-cyan-400">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1" />
            </div>
        ))}
        </motion.div>
        </AnimatePresence>
    );
};
