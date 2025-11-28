/**
 * InputActions - Oracle Theme
 * "Quick Invocations"
 *
 * Location: chat/components/input/InputActions.tsx
 */

import React from 'react';
import { Sparkles, FileText, Code } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface InputActionsProps {
  onActionClick?: (action: string) => void;
  className?: string;
}

const quickActions = [
  { id: 'explain', label: 'Reveal Meaning', icon: Sparkles },
{ id: 'summarize', label: 'Distill Truth', icon: FileText },
{ id: 'code', label: 'Fabricate Construct', icon: Code },
];

export const InputActions: React.FC<InputActionsProps> = ({
  onActionClick,
  className,
}) => {
  return (
    <div className={cn('flex items-center justify-center gap-3', className)}>
    {quickActions.map((action) => {
      const Icon = action.icon;
      return (
        <motion.button
        key={action.id}
        onClick={() => onActionClick?.(action.id)}
        whileHover={{ scale: 1.05, y: -1 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full',
          'bg-white/5 hover:bg-white/10 border border-white/5',
          'text-[10px] font-mono text-slate-400 hover:text-cyan-300 hover:border-cyan-500/20',
          'transition-all duration-300 backdrop-blur-sm'
        )}
        >
        <Icon size={10} />
        <span className="uppercase tracking-wider">{action.label}</span>
        </motion.button>
      );
    })}
    </div>
  );
};

export default InputActions;
