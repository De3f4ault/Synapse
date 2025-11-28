/**
 * DocumentPreview - Oracle Theme
 * "Text Record" Viewer.
 *
 * Location: chat/components/preview/DocumentPreview.tsx
 */

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, FileCode, Binary } from 'lucide-react';
import { cn, formatFileSize } from '@/lib/utils';
import { PreviewActions } from './PreviewActions';

interface DocumentPreviewProps {
  file: File;
  index: number;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  file,
  index,
}) => {
  const handleDownload = () => {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRemove = () => {
    // TODO: Implement file removal
    console.log('Remove file:', file.name);
  };

  const getFileIcon = () => {
    if (file.type === 'application/pdf') return FileText;
    if (file.name.endsWith('.json') || file.name.endsWith('.js') || file.name.endsWith('.ts')) return FileCode;
    return Binary;
  };

  const Icon = getFileIcon();

  return (
    <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.05 }}
    className={cn(
      'relative rounded-lg p-3',
      'bg-black/40 border border-white/10',
      'hover:border-cyan-500/30 hover:bg-white/5 transition-all duration-300'
    )}
    >
    <div className="flex items-start gap-4">
    {/* Icon Box */}
    <div className={cn(
      'w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center',
      'bg-cyan-950/30 border border-cyan-500/20 text-cyan-400'
    )}>
    <Icon className="w-5 h-5" strokeWidth={1.5} />
    </div>

    {/* Info */}
    <div className="flex-1 min-w-0">
    <p className="text-xs font-medium text-cyan-100 truncate mb-1 font-mono">
    {file.name}
    </p>
    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono uppercase">
    <span>{formatFileSize(file.size)}</span>
    <span className="text-slate-700">•</span>
    <span>{file.name.split('.').pop()}</span>
    </div>
    </div>
    </div>

    {/* Actions (Inline for Documents) */}
    <div className="mt-3 pt-2 border-t border-white/5 flex justify-end">
    <PreviewActions onDownload={handleDownload} onRemove={handleRemove} />
    </div>
    </motion.div>
  );
};

export default DocumentPreview;
