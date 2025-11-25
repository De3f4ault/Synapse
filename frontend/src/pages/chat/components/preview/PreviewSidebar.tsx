/**
 * PreviewSidebar - RIGHT edge (300px when active)
 * Right-side sidebar for file previews
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FilePreview } from './FilePreview';

interface PreviewSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  files?: File[]; // allow undefined safely
  className?: string;
}

export const PreviewSidebar: React.FC<PreviewSidebarProps> = ({
  isOpen,
  onClose,
  files = [], // <-- ensure always an array
  className,
}) => {
  return (
    <>
    {/* Backdrop */}
    <AnimatePresence>
    {isOpen && (
      <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
      />
    )}
    </AnimatePresence>

    {/* Sidebar */}
    <motion.aside
    initial={false}
    animate={{
      x: isOpen ? 0 : '100%',
    }}
    transition={{
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    }}
    className={cn(
      'fixed right-0 top-0 h-screen w-[350px] z-50',
      'bg-[#1D1E22] border-l border-[#353638]',
      'flex flex-col',
      'shadow-2xl',
      className
    )}
    >
    {/* Header */}
    <div className="flex items-center justify-between p-4 border-b border-[#353638]">
    <div>
    <h2 className="text-lg font-semibold text-white">Attached Files</h2>
    <p className="text-xs text-white/60 mt-0.5">
    {files.length} file{files.length !== 1 ? 's' : ''}
    </p>
    </div>

    <button
    onClick={onClose}
    className={cn(
      'p-2 rounded-lg',
      'text-white/60 hover:text-white hover:bg-white/10',
      'transition-colors duration-200'
    )}
    aria-label="Close preview"
    >
    <X className="w-5 h-5" strokeWidth={2} />
    </button>
    </div>

    {/* File List */}
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
    {files.length === 0 ? (
      <div className="flex flex-col items-center justify-center h-full text-center">
      <p className="text-white/40">No files attached</p>
      </div>
    ) : (
      files.map((file, index) => (
        <FilePreview key={index} file={file} index={index} />
      ))
    )}
    </div>
    </motion.aside>
    </>
  );
};

export default PreviewSidebar;
