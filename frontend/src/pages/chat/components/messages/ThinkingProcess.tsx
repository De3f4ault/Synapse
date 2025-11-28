/**
 * ThinkingProcess - Oracle Theme
 * Visualizes the "Gnosis" or "Decryption" phase of generation.
 *
 * Location: chat/components/messages/ThinkingProcess.tsx
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ChevronDown, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThinkingProcessProps {
  data?: any;
  isStreaming?: boolean;
  className?: string;
}

const THOUGHTS = [
  "PARSING_SEMANTIC_VECTORS...",
"ACCESSING_DEEP_ARCHIVE...",
"CROSS_REFERENCING_NODES...",
"SYNTHESIZING_LOGIC_GATES...",
"DECRYPTING_TRUTH_MATRIX...",
"CHECKING_ENTROPY_LEVELS..."
];

export const ThinkingProcess: React.FC<ThinkingProcessProps> = ({
  data,
  isStreaming,
  className,
}) => {
  const [currentThought, setCurrentThought] = useState(THOUGHTS[0]);
  const [isExpanded, setIsExpanded] = useState(isStreaming);

  // Cycle thoughts while streaming
  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      setCurrentThought(THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)]);
    }, 1200);
    return () => clearInterval(interval);
  }, [isStreaming]);

  // If we have actual thinking data (from DeepThink), we show the collapsible
  // If we are just visualising the wait time, we show the pulsing text

  if (isStreaming && !data) {
    return (
      <div className={cn("flex items-center gap-3 text-cyan-500/80 font-mono text-xs tracking-widest animate-pulse mb-4", className)}>
      <Loader2 size={14} className="animate-spin" />
      <span className="uppercase">{currentThought}</span>
      </div>
    );
  }

  if (!data) return null;

  // DeepThink Data Display
  const thinkingText = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  return (
    <div className={cn('mb-4', className)}>
    <button
    onClick={() => setIsExpanded(!isExpanded)}
    className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono uppercase tracking-wider transition-all",
      "bg-cyan-950/30 border-cyan-500/20 text-cyan-400 hover:bg-cyan-950/50"
    )}
    >
    <Brain size={12} />
    <span>Thought Process</span>
    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
    <ChevronDown size={12} />
    </motion.div>
    </button>

    <AnimatePresence>
    {isExpanded && (
      <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden"
      >
      <div className="mt-2 p-3 rounded-lg bg-black/40 border border-cyan-500/10 text-slate-400 text-xs font-mono whitespace-pre-wrap">
      {thinkingText}
      </div>
      </motion.div>
    )}
    </AnimatePresence>
    </div>
  );
};

export default ThinkingProcess;
