/**
 * ThinkingProcess - DeepThink collapsible reasoning
 * Shows AI's thought process (function_calls metadata)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Brain, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThinkingProcessProps {
  data: any; // function_calls metadata from backend
  className?: string;
}

export const ThinkingProcess: React.FC<ThinkingProcessProps> = ({
  data,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Parse thinking data
  const thinkingText = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const hasContent = thinkingText && thinkingText.length > 0;

  if (!hasContent) return null;

  return (
    <div className={cn('mb-3', className)}>
    {/* Collapsed Header */}
    <motion.button
    onClick={() => setIsExpanded(!isExpanded)}
    whileHover={{ scale: 1.01 }}
    whileTap={{ scale: 0.99 }}
    className={cn(
      'w-full flex items-center gap-2 px-3 py-2 rounded-lg',
      'bg-purple-500/10 border border-purple-500/20',
      'hover:bg-purple-500/15 transition-colors duration-200',
      'text-left'
    )}
    >
    <Brain className="w-4 h-4 text-purple-400 flex-shrink-0" />
    <span className="text-sm font-medium text-purple-300 flex-1">
    Thinking Process
    </span>
    <Zap className="w-3.5 h-3.5 text-purple-400/60" />
    <motion.div
    animate={{ rotate: isExpanded ? 180 : 0 }}
    transition={{ duration: 0.2 }}
    >
    <ChevronDown className="w-4 h-4 text-purple-400" />
    </motion.div>
    </motion.button>

    {/* Expanded Content */}
    <AnimatePresence>
    {isExpanded && (
      <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="overflow-hidden"
      >
      <div
      className={cn(
        'mt-2 p-4 rounded-lg',
        'bg-purple-500/5 border border-purple-500/10',
        'text-sm text-purple-200/80 leading-relaxed'
      )}
      >
      <pre className="whitespace-pre-wrap font-mono text-xs">
      {thinkingText}
      </pre>
      </div>
      </motion.div>
    )}
    </AnimatePresence>
    </div>
  );
};

export default ThinkingProcess;
