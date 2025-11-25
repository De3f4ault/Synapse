/**
 * DocumentPreview - PDF/doc viewer
 * Displays document file info with icon
 */

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, File } from 'lucide-react';
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
    if (file.type === 'application/pdf') {
      return FileText;
    }
    return File;
  };

  const getFileColor = () => {
    if (file.type === 'application/pdf') {
      return 'text-red-400';
    }
    return 'text-blue-400';
  };

  const Icon = getFileIcon();
  const colorClass = getFileColor();

  return (
    <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className={cn(
      'relative rounded-lg',
      'bg-[#19191C] border border-[#353638]',
      'p-4'
    )}
    >
    <div className="flex items-start gap-3">
    {/* Icon */}
    <div
    className={cn(
      'w-12 h-12 rounded-lg flex-shrink-0',
      'bg-[#353638]/50 border border-[#353638]',
      'flex items-center justify-center'
    )}
    >
    <Icon className={cn('w-6 h-6', colorClass)} strokeWidth={2} />
    </div>

    {/* Info */}
    <div className="flex-1 min-w-0">
    <p className="text-sm font-medium text-white truncate mb-1">
    {file.name}
    </p>
    <div className="flex items-center gap-2 text-xs text-white/40">
    <span>{formatFileSize(file.size)}</span>
    <span>•</span>
    <span>{file.type.split('/')[1].toUpperCase()}</span>
    </div>
    </div>
    </div>

    {/* Actions */}
    <PreviewActions
    onDownload={handleDownload}
    onRemove={handleRemove}
    />
    </motion.div>
  );
};

export default DocumentPreview;
