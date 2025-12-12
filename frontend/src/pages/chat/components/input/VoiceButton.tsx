/**
 * VoiceButton - Oracle Theme
 * "Telepathic Invocation" Interface
 *
 * Location: chat/components/input/VoiceButton.tsx
 */

import React, { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VoiceButtonProps {
  disabled?: boolean;
  className?: string;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  disabled = false,
  className,
}) => {
  const [isRecording, setIsRecording] = useState(false);

  const handleClick = () => {
    if (disabled) return;

    if (!isRecording) {
      setIsRecording(true);
      toast.info('Channeling voice input...');
      setTimeout(() => setIsRecording(false), 3000); // Mock
    } else {
      setIsRecording(false);
    }
  };

  return (
    <motion.button
    type="button"
    onClick={handleClick}
    disabled={disabled}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
    className={cn(
      'p-2.5 rounded-full transition-all duration-300 relative',
      disabled ? 'text-slate-700 cursor-not-allowed' : '',
      !disabled && !isRecording ? 'text-slate-500 hover:text-purple-400 hover:bg-white/5' : '',
      isRecording ? 'text-red-500 bg-red-500/10' : '',
      className
    )}
    title="Telepathic Voice Invocation"
    >
    <AnimatePresence mode="wait">
    {isRecording ? (
      <motion.div
      key="recording"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.5, opacity: 0 }}
      >
      <MicOff size={20} />
      <span className="absolute inset-0 rounded-full animate-ping bg-red-500/20" />
      </motion.div>
    ) : (
      <motion.div
      key="idle"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.5, opacity: 0 }}
      >
      <Mic size={20} />
      </motion.div>
    )}
    </AnimatePresence>
    </motion.button>
  );
};

export default VoiceButton;
