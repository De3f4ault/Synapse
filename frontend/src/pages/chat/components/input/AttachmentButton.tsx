/**
 * AttachmentButton - File upload icon
 * Opens file picker for document/image uploads
 */

import React, { useRef } from 'react';
import { Paperclip } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AttachmentButtonProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
}

const ALLOWED_FILE_TYPES = [
  'application/pdf',
'image/png',
'image/jpeg',
'image/jpg',
'image/webp',
'text/plain',
'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
'application/msword',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const AttachmentButton: React.FC<AttachmentButtonProps> = ({
  onFilesSelected,
  disabled = false,
  className,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validate files
    const validFiles: File[] = [];
    for (const file of files) {
      // Check file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast.error(`${file.name}: File type not supported`);
        continue;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: File too large (max 10MB)`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
      toast.success(`${validFiles.length} file(s) attached`);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
    <motion.button
    type="button"
    onClick={handleClick}
    disabled={disabled}
    whileHover={{ scale: disabled ? 1 : 1.05 }}
    whileTap={{ scale: disabled ? 1 : 0.95 }}
    className={cn(
      'p-2 rounded-lg',
      'transition-colors duration-200',
      disabled
      ? 'text-white/30 cursor-not-allowed'
      : 'text-white/60 hover:text-white hover:bg-white/10',
      className
    )}
    aria-label="Attach file"
    >
    <Paperclip className="w-5 h-5" strokeWidth={2} />
    </motion.button>

    {/* Hidden File Input */}
    <input
    ref={fileInputRef}
    type="file"
    multiple
    accept={ALLOWED_FILE_TYPES.join(',')}
    onChange={handleFileChange}
    className="hidden"
    />
    </>
  );
};

export default AttachmentButton;
