/**
 * SidebarToggle - DeepSeek style sidebar toggle
 * Clean, minimal toggle button with smooth animation
 */

import React from 'react';
import { motion } from 'framer-motion';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarToggleProps {
  isCollapsed: boolean;
  onClick: () => void;
  className?: string;
}

export const SidebarToggle: React.FC<SidebarToggleProps> = ({
  isCollapsed,
  onClick,
  className,
}) => {
  return (
    <button
    onClick={onClick}
    className={cn(
      'flex items-center justify-center',
      'w-8 h-8 rounded-md',
      'text-white/60 hover:text-white',
      'hover:bg-white/5',
      'transition-all duration-150',
      'focus:outline-none focus:ring-1 focus:ring-white/20',
      className
    )}
    aria-label={isCollapsed ? 'Open sidebar' : 'Close sidebar'}
    >
    <motion.div
    initial={false}
    animate={{
      rotate: isCollapsed ? 0 : 180,
      scale: isCollapsed ? 1 : 0.95
    }}
    transition={{
      type: "spring",
      stiffness: 400,
      damping: 25
    }}
    >
    {isCollapsed ? (
      <PanelLeftOpen className="w-4 h-4" strokeWidth={2} />
    ) : (
      <PanelLeftClose className="w-4 h-4" strokeWidth={2} />
    )}
    </motion.div>
    </button>
  );
};

export default SidebarToggle;
