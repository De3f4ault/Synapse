/**
 * ModeToggle - Oracle Theme
 * "Consciousness State" Selector
 *
 * Location: chat/components/input/ModeToggle.tsx
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Search, MessageSquare, Sparkles } from 'lucide-react';
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
}> = [
  { value: 'synapse', label: 'Synapse', icon: Sparkles },
{ value: 'standard', label: 'Standard', icon: MessageSquare },
{ value: 'web', label: 'Web', icon: Search },
];

export const ModeToggle: React.FC<ModeToggleProps> = ({
  mode,
  onModeChange,
  className,
}) => {
  return (
    <div className={cn("flex justify-center", className)}>
    <div className="bg-black/60 backdrop-blur-xl p-1 rounded-full flex items-center border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
    {modes.map((m) => {
      const isActive = mode === m.value;
      const Icon = m.icon;

      return (
        <button
        key={m.value}
        onClick={() => onModeChange(m.value)}
        className={cn(
          "relative px-4 py-2 rounded-full text-[10px] md:text-xs font-mono font-semibold flex items-center gap-2 transition-all duration-300 uppercase tracking-wider",
          isActive ? "text-white" : "text-slate-500 hover:text-slate-300"
        )}
        >
        {isActive && (
          <motion.div
          layoutId="active-mode-pill"
          className="absolute inset-0 bg-cyan-900/40 border border-cyan-500/30 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.2)]"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-2">
        <Icon size={12} className={isActive ? "text-cyan-400" : "text-slate-600"} />
        {m.label}
        </span>
        </button>
      );
    })}
    </div>
    </div>
  );
};

export default ModeToggle;
