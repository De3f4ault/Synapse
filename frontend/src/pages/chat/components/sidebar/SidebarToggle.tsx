/**
 * SidebarToggle - Oracle Theme
 *
 * Location: chat/components/sidebar/SidebarToggle.tsx
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
      'p-2 text-slate-500 hover:text-cyan-400 transition-colors rounded-full hover:bg-white/5',
      'focus:outline-none',
      className
    )}
    aria-label={isCollapsed ? 'Expand Grimoire' : 'Collapse Grimoire'}
    >
    <motion.div
    initial={false}
    animate={{ scale: 1 }}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    >
    {isCollapsed ? (
      <ChevronRight size={24} />
    ) : (
      <ChevronLeft size={24} />
    )}
    </motion.div>
    </button>
  );
};

export default SidebarToggle;
