/**
 * PreviewActions - Oracle Theme
 * Minimal controls for artifact management.
 *
 * Location: chat/components/preview/PreviewActions.tsx
 */

import React from 'react';
import { Download, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PreviewActionsProps {
  onDownload: () => void;
  onRemove: () => void;
  className?: string;
}

export const PreviewActions: React.FC<PreviewActionsProps> = ({
  onDownload,
  onRemove,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-1', className)}>
    {/* Download Button */}
    <motion.button
    onClick={onDownload}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
    className={cn(
      'p-1.5 rounded-md',
      'text-slate-500 hover:text-cyan-400 hover:bg-cyan-900/20',
      'transition-colors duration-200'
    )}
    title="Extract Artifact"
    >
    <Download size={14} />
    </motion.button>

    {/* Remove Button */}
    <motion.button
    onClick={onRemove}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
    className={cn(
      'p-1.5 rounded-md',
      'text-slate-500 hover:text-red-400 hover:bg-red-900/20',
      'transition-colors duration-200'
    )}
    title="Purge Artifact"
    >
    <Trash2 size={14} />
    </motion.button>
    </div>
  );
};

export default PreviewActions;
