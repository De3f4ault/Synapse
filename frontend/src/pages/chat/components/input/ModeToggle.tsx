/**
 * ModeToggle - Pills: "DeepThink" | "Search" | "Normal"
 * Pill-style mode selector with smooth transitions
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Search, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMode } from './MainInput';

interface ModeToggleProps {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  className?: string;
}

const modes: Array<{
  value: ChatMode;
  label: string;
  icon: React.ElementType;
  description: string;
}> = [
  {
    value: 'normal',
    label: 'Normal',
    icon: MessageSquare,
    description: 'Standard AI responses',
  },
{
  value: 'deepthink',
  label: 'DeepThink',
  icon: Brain,
  description: 'Detailed reasoning process',
},
{
  value: 'search',
  label: 'Search',
  icon: Search,
  description: 'Web-enhanced answers',
},
];

export const ModeToggle: React.FC<ModeToggleProps> = ({
  mode,
  onModeChange,
  className,
}) => {
  return (
    <div
    className={cn(
      'inline-flex items-center gap-1 p-1 rounded-full',
      'bg-[#1D1E22]/80 backdrop-blur-sm',
      'border border-[#353638]',
      className
    )}
    >
    {modes.map((modeOption) => {
      const Icon = modeOption.icon;
      const isActive = mode === modeOption.value;

      return (
        <motion.button
        key={modeOption.value}
        onClick={() => onModeChange(modeOption.value)}
        className={cn(
          'relative px-4 py-1.5 rounded-full',
          'text-sm font-medium transition-colors duration-200',
          'flex items-center gap-2',
          isActive
          ? 'text-white'
          : 'text-white/60 hover:text-white/80'
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        title={modeOption.description}
        >
        {/* Active Background */}
        {isActive && (
          <motion.div
          layoutId="activeModeBackground"
          className="absolute inset-0 rounded-full bg-[#5685FE]"
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
          />
        )}

        {/* Icon */}
        <Icon
        className={cn(
          'w-4 h-4 relative z-10',
          isActive ? 'text-white' : 'text-white/60'
        )}
        strokeWidth={2}
        />

        {/* Label */}
        <span className="relative z-10">{modeOption.label}</span>
        </motion.button>
      );
    })}
    </div>
  );
};

export default ModeToggle;
