/**
 * PreviewSidebar - Oracle Theme
 * "Artifact Manifest" - Right-side panel for file inspection.
 *
 * Location: chat/components/preview/PreviewSidebar.tsx
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FilePreview } from './FilePreview';

interface PreviewSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  files?: File[];
  className?: string;
}

export const PreviewSidebar: React.FC<PreviewSidebarProps> = ({
  isOpen,
  onClose,
  files = [],
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
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
      />
    )}
    </AnimatePresence>

    {/* Sidebar Panel */}
    <motion.aside
    initial={false}
    animate={{
      x: isOpen ? 0 : '100%',
      opacity: isOpen ? 1 : 0
    }}
    transition={{
      type: 'spring',
      stiffness: 300,
      damping: 30
    }}
    className={cn(
      'fixed right-0 top-0 h-screen w-[350px] z-50',
      'bg-[#050505]/95 backdrop-blur-xl border-l border-white/10',
      'flex flex-col shadow-2xl shadow-cyan-900/20',
      className
    )}
    >
    {/* Header */}
    <div className="flex items-center justify-between p-6 border-b border-white/5">
    <div className="flex items-center gap-3">
    <Database className="w-5 h-5 text-cyan-400" />
    <div>
    <h2 className="text-sm font-serif font-bold text-cyan-100 tracking-wider">ARTIFACTS</h2>
    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">
    {files.length} DATA {files.length === 1 ? 'UNIT' : 'UNITS'}
    </p>
    </div>
    </div>

    <button
    onClick={onClose}
    className={cn(
      'p-2 rounded-full',
      'text-slate-500 hover:text-white hover:bg-white/10',
      'transition-colors duration-200'
    )}
    aria-label="Close manifest"
    >
    <X className="w-5 h-5" strokeWidth={1.5} />
    </button>
    </div>

    {/* File List */}
    <div className="flex-1 overflow-y-auto p-4 space-y-4 oracle-scrollbar">
    {files.length === 0 ? (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/5">
      <Database className="w-6 h-6 text-white/20" />
      </div>
      <p className="text-xs font-mono text-slate-600 uppercase tracking-widest">
      No artifacts mounted
      </p>
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
