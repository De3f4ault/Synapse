/**
 * InputActions - Bottom row of mode toggles
 * Additional action buttons below the main input
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
  {
    id: 'explain',
    label: 'Explain this',
    icon: Sparkles,
  },
{
  id: 'summarize',
  label: 'Summarize',
  icon: FileText,
},
{
  id: 'code',
  label: 'Write code',
  icon: Code,
},
];

export const InputActions: React.FC<InputActionsProps> = ({
  onActionClick,
  className,
}) => {
  return (
    <div
    className={cn(
      'flex items-center justify-center gap-2 flex-wrap',
      className
    )}
    >
    {quickActions.map((action) => {
      const Icon = action.icon;

      return (
        <motion.button
        key={action.id}
        onClick={() => onActionClick?.(action.id)}
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg',
          'bg-[#1D1E22]/60 backdrop-blur-sm',
          'border border-[#353638]',
          'text-xs font-medium text-white/70',
          'hover:text-white hover:border-[#5685FE]/30',
          'transition-all duration-200'
        )}
        >
        <Icon className="w-3.5 h-3.5" strokeWidth={2} />
        <span>{action.label}</span>
        </motion.button>
      );
    })}
    </div>
  );
};

export default InputActions;
