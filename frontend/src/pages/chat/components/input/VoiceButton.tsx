/**
 * VoiceButton - Microphone icon
 * Voice input recording (placeholder for future implementation)
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

    // TODO: Implement voice recording
    // For now, just show a toast
    if (!isRecording) {
      setIsRecording(true);
      toast.info('Voice input feature coming soon!');

      // Auto-stop after 3 seconds (demo)
      setTimeout(() => {
        setIsRecording(false);
      }, 3000);
    } else {
      setIsRecording(false);
      toast.info('Recording stopped');
    }
  };

  return (
    <motion.button
    type="button"
    onClick={handleClick}
    disabled={disabled}
    whileHover={{ scale: disabled ? 1 : 1.05 }}
    whileTap={{ scale: disabled ? 1 : 0.95 }}
    className={cn(
      'relative p-2 rounded-lg',
      'transition-colors duration-200',
      disabled
      ? 'text-white/30 cursor-not-allowed'
      : isRecording
      ? 'text-red-400 bg-red-500/20'
      : 'text-white/60 hover:text-white hover:bg-white/10',
      className
    )}
    aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
    >
    <AnimatePresence mode="wait">
    {isRecording ? (
      <motion.div
      key="recording"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.2 }}
      >
      <MicOff className="w-5 h-5" strokeWidth={2} />
      </motion.div>
    ) : (
      <motion.div
      key="idle"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.2 }}
      >
      <Mic className="w-5 h-5" strokeWidth={2} />
      </motion.div>
    )}
    </AnimatePresence>

    {/* Recording Pulse Animation */}
    {isRecording && (
      <motion.div
      className="absolute inset-0 rounded-lg bg-red-500"
      initial={{ scale: 1, opacity: 0.5 }}
      animate={{ scale: 1.5, opacity: 0 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'easeOut',
      }}
      />
    )}
    </motion.button>
  );
};

export default VoiceButton;
