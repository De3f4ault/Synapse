/**
 * PreviewActions - Remove, download icons
 * Action buttons for file previews
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
    <div
    className={cn(
      'mt-3 flex items-center gap-2',
      className
    )}
    >
    {/* Download Button */}
    <motion.button
    onClick={onDownload}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className={cn(
      'flex-1 flex items-center justify-center gap-2',
      'px-3 py-2 rounded-lg',
      'bg-[#353638]/50 hover:bg-[#353638]',
      'border border-[#353638]',
      'text-xs font-medium text-white/80 hover:text-white',
      'transition-colors duration-200'
    )}
    >
    <Download className="w-4 h-4" strokeWidth={2} />
    <span>Download</span>
    </motion.button>

    {/* Remove Button */}
    <motion.button
    onClick={onRemove}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className={cn(
      'p-2 rounded-lg',
      'bg-red-500/10 hover:bg-red-500/20',
      'border border-red-500/20',
      'text-red-400 hover:text-red-300',
      'transition-colors duration-200'
    )}
    aria-label="Remove file"
    >
    <Trash2 className="w-4 h-4" strokeWidth={2} />
    </motion.button>
    </div>
  );
};

export default PreviewActions;
