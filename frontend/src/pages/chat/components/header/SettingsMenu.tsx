/**
 * SettingsMenu - Oracle Theme
 * "System Configuration" - Global settings and tools.
 *
 * Location: chat/components/header/SettingsMenu.tsx
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  HelpCircle,
  Cpu,
  Shield,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const SettingsMenu: React.FC = () => {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
    <DropdownMenuTrigger asChild>
    <button
    className={cn(
      'flex items-center justify-center w-10 h-10 rounded-full',
      'bg-black/40 border border-white/5 hover:border-cyan-500/30',
      'text-slate-400 hover:text-cyan-300',
      'transition-all duration-200 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]',
                  'focus:outline-none focus:ring-1 focus:ring-cyan-500/50'
    )}
    aria-label="System Menu"
    >
    <Settings className="w-5 h-5" strokeWidth={1.5} />
    </button>
    </DropdownMenuTrigger>

    <DropdownMenuContent
    align="end"
    className="w-60 bg-[#050505]/95 border border-white/10 backdrop-blur-xl text-slate-300 z-50"
    >
    <div className="px-3 py-2">
    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">System Controls</p>
    </div>

    <DropdownMenuSeparator className="bg-white/10" />

    <DropdownMenuItem
    onClick={() => navigate('/settings/system')}
    className="group cursor-pointer py-2 focus:bg-white/5 focus:text-cyan-300"
    >
    <Cpu className="w-4 h-4 mr-3 text-slate-500 group-hover:text-cyan-400" />
    <span className="text-xs font-medium uppercase tracking-wide">Interface Config</span>
    </DropdownMenuItem>

    <DropdownMenuItem
    onClick={() => navigate('/status')}
    className="group cursor-pointer py-2 focus:bg-white/5 focus:text-cyan-300"
    >
    <Activity className="w-4 h-4 mr-3 text-slate-500 group-hover:text-emerald-400" />
    <span className="text-xs font-medium uppercase tracking-wide">Network Status</span>
    </DropdownMenuItem>

    <DropdownMenuItem
    onClick={() => navigate('/security')}
    className="group cursor-pointer py-2 focus:bg-white/5 focus:text-cyan-300"
    >
    <Shield className="w-4 h-4 mr-3 text-slate-500 group-hover:text-amber-400" />
    <span className="text-xs font-medium uppercase tracking-wide">Security Protocols</span>
    </DropdownMenuItem>

    <DropdownMenuSeparator className="bg-white/10" />

    <DropdownMenuItem
    onClick={() => navigate('/help')}
    className="group cursor-pointer py-2 focus:bg-white/5 focus:text-cyan-300"
    >
    <HelpCircle className="w-4 h-4 mr-3 text-slate-500 group-hover:text-purple-400" />
    <span className="text-xs font-medium uppercase tracking-wide">Oracle Guide</span>
    </DropdownMenuItem>
    </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SettingsMenu;
