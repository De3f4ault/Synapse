/**
 * ImagePreview - Image viewer
 * Displays image thumbnails with fullscreen option
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, Download, Trash2 } from 'lucide-react';
import { cn, formatFileSize } from '@/lib/utils';
import { PreviewActions } from './PreviewActions';

interface ImagePreviewProps {
  file: File;
  index: number;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ file, index }) => {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = file.name;
    link.click();
  };

  const handleRemove = () => {
    // TODO: Implement file removal
    console.log('Remove file:', file.name);
  };

  return (
    <>
    <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className={cn(
      'relative rounded-lg overflow-hidden',
      'bg-[#19191C] border border-[#353638]'
    )}
    >
    {/* Image */}
    <div className="relative aspect-video w-full overflow-hidden">
    <img
    src={previewUrl}
    alt={file.name}
    className="w-full h-full object-cover"
    />

    {/* Hover Overlay */}
    <div
    className={cn(
      'absolute inset-0 bg-black/60 backdrop-blur-sm',
      'flex items-center justify-center gap-2',
      'opacity-0 hover:opacity-100 transition-opacity duration-200'
    )}
    >
    <button
    onClick={() => setIsFullscreen(true)}
    className={cn(
      'p-2 rounded-full',
      'bg-white/10 hover:bg-white/20',
      'text-white transition-colors'
    )}
    aria-label="View fullscreen"
    >
    <ZoomIn className="w-5 h-5" />
    </button>
    </div>
    </div>

    {/* File Info */}
    <div className="p-3">
    <p className="text-sm font-medium text-white truncate mb-1">
    {file.name}
    </p>
    <p className="text-xs text-white/40">
    {formatFileSize(file.size)}
    </p>
    </div>

    {/* Actions */}
    <PreviewActions
    onDownload={handleDownload}
    onRemove={handleRemove}
    />
    </motion.div>

    {/* Fullscreen Modal */}
    {isFullscreen && (
      <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setIsFullscreen(false)}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      >
      <img
      src={previewUrl}
      alt={file.name}
      className="max-w-full max-h-full object-contain"
      onClick={(e) => e.stopPropagation()}
      />
      </motion.div>
    )}
    </>
  );
};

export default ImagePreview;
