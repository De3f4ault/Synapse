/**
 * UserAvatar - Bottom profile pill
 * Shows user info and settings access
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, LogOut, User } from 'lucide-react';
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

  const handleSettings = () => {
    navigate('/settings');
  };

  if (!user) return null;

  return (
    <DropdownMenu>
    <DropdownMenuTrigger asChild>
    <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className={cn(
      'w-full flex items-center gap-3 p-2 rounded-lg',
      'text-white/70 hover:text-white hover:bg-medium/50',
      'transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-primary/50',
      isCollapsed && 'justify-center'
    )}
    >
    {/* Avatar Circle */}
    <div
    className={cn(
      'flex items-center justify-center rounded-full',
      'bg-gradient-to-br from-primary to-primary/70',
      'text-white font-semibold text-sm',
      isCollapsed ? 'w-8 h-8' : 'w-9 h-9'
    )}
    >
    {getInitials(user.full_name)}
    </div>

    {/* User Info - Hidden when collapsed */}
    <AnimatePresence mode="wait">
    {!isCollapsed && (
      <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2 }}
      className="flex-1 min-w-0 text-left"
      >
      <p className="text-sm font-medium text-white truncate">
      {user.full_name}
      </p>
      <p className="text-xs text-white/40 truncate">{user.email}</p>
      </motion.div>
    )}
    </AnimatePresence>

    {/* Settings Icon - Hidden when collapsed */}
    {!isCollapsed && (
      <Settings className="w-4 h-4 text-white/40 group-hover:text-white/60 flex-shrink-0" />
    )}
    </motion.button>
    </DropdownMenuTrigger>

    <DropdownMenuContent
    side="right"
    align="end"
    className="w-56 bg-darker border-medium"
    >
    <div className="px-2 py-1.5">
    <p className="text-sm font-medium text-white">{user.full_name}</p>
    <p className="text-xs text-white/40">{user.email}</p>
    </div>

    <DropdownMenuSeparator className="bg-medium" />

    <DropdownMenuItem
    onClick={handleSettings}
    className="text-white/70 hover:text-white hover:bg-medium/50 cursor-pointer"
    >
    <User className="w-4 h-4 mr-2" />
    Profile Settings
    </DropdownMenuItem>

    <DropdownMenuSeparator className="bg-medium" />

    <DropdownMenuItem
    onClick={handleLogout}
    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
    >
    <LogOut className="w-4 h-4 mr-2" />
    Logout
    </DropdownMenuItem>
    </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserAvatar;
