/**
 * ImagePreview - Oracle Theme
 * "Visual Record" Viewer.
 *
 * Location: chat/components/preview/ImagePreview.tsx
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, Eye } from 'lucide-react';
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
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = file.name;
    link.click();
  };

  const handleRemove = () => {
    // TODO: Implement removal via context or callback
    console.log('Remove artifact:', file.name);
  };

  return (
    <>
    <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className={cn(
      'relative rounded-lg overflow-hidden group',
      'bg-black/40 border border-white/10',
      'hover:border-cyan-500/30 transition-colors duration-300'
    )}
    >
    {/* Image Container */}
    <div className="relative aspect-video w-full overflow-hidden bg-[url('https://grainy-gradients.vercel.app/noise.svg')]">
    <img
    src={previewUrl}
    alt={file.name}
    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
    />

    {/* Hover Overlay */}
    <div
    className={cn(
      'absolute inset-0 bg-black/60 backdrop-blur-[2px]',
      'flex items-center justify-center gap-2',
      'opacity-0 group-hover:opacity-100 transition-all duration-300'
    )}
    >
    <button
    onClick={() => setIsFullscreen(true)}
    className="p-3 rounded-full bg-cyan-900/40 border border-cyan-500/30 text-cyan-200 hover:text-white hover:bg-cyan-500/20 transition-all transform hover:scale-110"
    aria-label="Inspect visual"
    >
    <ZoomIn className="w-5 h-5" />
    </button>
    </div>

    {/* Scanline Effect */}
    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20" />
    </div>

    {/* Metadata Footer */}
    <div className="p-3 border-t border-white/5 bg-black/60">
    <div className="flex items-center justify-between mb-2">
    <div className="flex items-center gap-2 overflow-hidden">
    <Eye size={12} className="text-cyan-500 flex-shrink-0" />
    <p className="text-xs font-mono text-cyan-100 truncate">
    {file.name}
    </p>
    </div>
    </div>

    <div className="flex items-center justify-between">
    <p className="text-[10px] font-mono text-slate-500 uppercase">
    IMG // {formatFileSize(file.size)}
    </p>
    <PreviewActions onDownload={handleDownload} onRemove={handleRemove} />
    </div>
    </div>
    </motion.div>

    {/* Fullscreen Modal (Lightbox) */}
    <AnimatePresence>
    {isFullscreen && (
      <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setIsFullscreen(false)}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-8 cursor-zoom-out"
      >
      <motion.img
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      src={previewUrl}
      alt={file.name}
      className="max-w-full max-h-full object-contain shadow-2xl shadow-cyan-900/20 border border-white/10 rounded-lg"
      onClick={(e) => e.stopPropagation()}
      />

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
      <p className="text-sm font-mono text-cyan-500 uppercase tracking-[0.3em]">Visual Record Analysis</p>
      </div>
      </motion.div>
    )}
    </AnimatePresence>
    </>
  );
};

export default ImagePreview;
