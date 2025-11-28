/**
 * AttachmentButton - Oracle Theme
 * "Artifact Injection" Interface
 *
 * Location: chat/components/input/AttachmentButton.tsx
 */

import React, { useRef } from 'react';
import { Paperclip, FileCode } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AttachmentButtonProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
  isDeepGnosis?: boolean; // Added for thematic context
}

const ALLOWED_FILE_TYPES = [
  'application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
'application/msword',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const AttachmentButton: React.FC<AttachmentButtonProps> = ({
  onFilesSelected,
  disabled = false,
  className,
  isDeepGnosis = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];

    files.forEach(file => {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast.error(`Invalid artifact type: ${file.name}`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Artifact too dense: ${file.name}`);
        return;
      }
      validFiles.push(file);
    });

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
      toast.success(`${validFiles.length} artifacts prepared for analysis`);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

    return (
      <>
      <motion.button
      type="button"
      onClick={() => !disabled && fileInputRef.current?.click()}
      disabled={disabled}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className={cn(
        'p-2.5 rounded-full transition-all duration-300',
        disabled
        ? 'text-slate-700 cursor-not-allowed'
        : 'text-slate-500 hover:text-cyan-400 hover:bg-white/5',
        isDeepGnosis && !disabled && 'hover:text-amber-400',
        className
      )}
      title="Inject Data Artifact"
      >
      {isDeepGnosis ? <FileCode size={20} /> : <Paperclip size={20} />}
      </motion.button>

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
