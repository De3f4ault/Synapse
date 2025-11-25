/**
 * TopBar - Minimal top bar (logo, model selector)
 * Transparent header with glassmorphism
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Brain } from 'lucide-react';
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
      'sticky top-0 z-30',
      'h-16 px-4',
      'bg-[#19191C]/80 backdrop-blur-xl',
      'border-b border-[#353638]',
      'flex items-center justify-between',
      className
    )}
    >
    {/* Logo */}
    <Link
    to="/dashboard"
    className={cn(
      'flex items-center gap-2',
      'text-white hover:text-white/80',
      'transition-colors duration-200'
    )}
    >
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5685FE] to-[#4a74e6] flex items-center justify-center">
    <Brain className="w-5 h-5 text-white" strokeWidth={2} />
    </div>
    <span className="font-semibold text-lg">Synapse</span>
    </Link>

    {/* Center - Model Selector */}
    <div className="absolute left-1/2 -translate-x-1/2">
    <ModelSelector />
    </div>

    {/* Right - Settings */}
    <SettingsMenu />
    </header>
  );
};

export default TopBar;
