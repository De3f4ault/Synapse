/**
 * UserAvatar - Oracle Theme
 * "Identity Matrix" - Footer profile and settings.
 *
 * Location: chat/components/sidebar/UserAvatar.tsx
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, LogOut, Sliders } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserAvatarProps {
  isCollapsed: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ isCollapsed }) => {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <DropdownMenu>
    <DropdownMenuTrigger asChild>
    <button
    className={cn(
      "flex items-center justify-between w-full text-xs text-slate-500 font-mono transition-colors group",
      "hover:text-cyan-400"
    )}
    >
    {/* Left Side: Version / Label */}
    <span className="truncate">
    ID: {user.full_name.toUpperCase()}
    </span>

    {/* Right Side: Settings Icon */}
    <div className="flex items-center gap-2">
    <Sliders size={14} className="group-hover:rotate-90 transition-transform duration-500" />
    </div>
    </button>
    </DropdownMenuTrigger>

    {/* Styled Dropdown */}
    <DropdownMenuContent
    side="top"
    align="start"
    className="w-56 bg-black/90 border border-white/10 backdrop-blur-xl text-slate-300"
    >
    <div className="px-2 py-2">
    <p className="text-xs font-mono uppercase tracking-wider text-cyan-500/80 mb-1">Current Identity</p>
    <p className="text-sm font-bold text-white truncate">{user.full_name}</p>
    <p className="text-xs text-slate-500 truncate">{user.email}</p>
    </div>

    <DropdownMenuSeparator className="bg-white/10" />

    <DropdownMenuItem
    onClick={() => navigate('/settings')}
    className="text-xs font-mono uppercase tracking-widest focus:bg-cyan-900/20 focus:text-cyan-400 cursor-pointer py-2"
    >
    <Settings className="w-3.5 h-3.5 mr-2" />
    Config Matrix
    </DropdownMenuItem>

    <DropdownMenuSeparator className="bg-white/10" />

    <DropdownMenuItem
    onClick={handleLogout}
    className="text-xs font-mono uppercase tracking-widest text-red-400 focus:bg-red-900/20 focus:text-red-300 cursor-pointer py-2"
    >
    <LogOut className="w-3.5 h-3.5 mr-2" />
    Sever Connection
    </DropdownMenuItem>
    </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserAvatar;
