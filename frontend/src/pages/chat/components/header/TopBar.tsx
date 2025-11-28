/**
 * TopBar - Oracle Theme
 * "Command Interface" - Global navigation and model control.
 *
 * Location: chat/components/header/TopBar.tsx
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Atom } from 'lucide-react'; // Switched Brain for Atom for Oracle vibe
import { cn } from '@/lib/utils';
import { ModelSelector } from './ModelSelector';
import { SettingsMenu } from './SettingsMenu';

interface TopBarProps {
  className?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ className }) => {
  return (
    <header
    className={cn(
      'absolute top-0 left-0 right-0 z-30', // Absolute positioning to float over background
      'h-20 px-6',
      'flex items-center justify-between',
      'bg-gradient-to-b from-black/80 to-transparent', // Gradient fade instead of solid border
      className
    )}
    >
    {/* Left - Branding */}
    <Link
    to="/dashboard"
    className="flex items-center gap-3 group"
    >
    <div className="relative w-8 h-8 flex items-center justify-center">
    <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-md group-hover:bg-cyan-500/40 transition-colors" />
    <Atom className="w-6 h-6 text-cyan-400 relative z-10 animate-spin-slow" />
    </div>
    <div className="flex flex-col">
    <span className="font-serif text-lg text-white font-bold tracking-[0.2em]">ORACLE</span>
    <span className="text-[8px] font-mono text-cyan-500/60 uppercase tracking-[0.3em] pl-0.5">Network Active</span>
    </div>
    </Link>

    {/* Center - Neural Core Selector (Model) */}
    <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
    <ModelSelector />
    </div>

    {/* Right - System Controls */}
    <div className="flex items-center gap-4">
    {/* Mobile Model Selector (Visible only on small screens) */}
    <div className="md:hidden">
    <ModelSelector />
    </div>

    <SettingsMenu />
    </div>
    </header>
  );
};

export default TopBar;
