/**
 * SettingsMenu - User settings dropdown
 * User profile and settings access
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  User,
  LogOut,
  FileText,
  CreditCard,
  HelpCircle,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const SettingsMenu: React.FC = () => {
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
      'flex items-center gap-3 px-3 py-2 rounded-lg',
      'hover:bg-[#353638]/50',
      'transition-colors duration-200',
      'focus:outline-none focus:ring-2 focus:ring-[#5685FE]/50'
    )}
    >
    {/* Avatar */}
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5685FE] to-[#4a74e6] flex items-center justify-center text-white text-sm font-semibold">
    {getInitials(user.full_name)}
    </div>

    {/* Settings Icon */}
    <Settings className="w-5 h-5 text-white/60" strokeWidth={2} />
    </button>
    </DropdownMenuTrigger>

    <DropdownMenuContent
    align="end"
    className="w-56 bg-[#1D1E22] border-[#353638]"
    >
    {/* User Info */}
    <div className="px-2 py-1.5">
    <p className="text-sm font-medium text-white">{user.full_name}</p>
    <p className="text-xs text-white/40 truncate">{user.email}</p>
    </div>

    <DropdownMenuSeparator className="bg-[#353638]" />

    {/* Menu Items */}
    <DropdownMenuItem
    onClick={() => navigate('/settings/profile')}
    className="text-white/70 hover:text-white hover:bg-[#353638]/50 cursor-pointer"
    >
    <User className="w-4 h-4 mr-2" />
    Profile Settings
    </DropdownMenuItem>

    <DropdownMenuItem
    onClick={() => navigate('/documents')}
    className="text-white/70 hover:text-white hover:bg-[#353638]/50 cursor-pointer"
    >
    <FileText className="w-4 h-4 mr-2" />
    My Documents
    </DropdownMenuItem>

    <DropdownMenuItem
    onClick={() => navigate('/settings/billing')}
    className="text-white/70 hover:text-white hover:bg-[#353638]/50 cursor-pointer"
    >
    <CreditCard className="w-4 h-4 mr-2" />
    Billing
    </DropdownMenuItem>

    <DropdownMenuItem
    onClick={() => navigate('/help')}
    className="text-white/70 hover:text-white hover:bg-[#353638]/50 cursor-pointer"
    >
    <HelpCircle className="w-4 h-4 mr-2" />
    Help & Support
    </DropdownMenuItem>

    <DropdownMenuSeparator className="bg-[#353638]" />

    {/* Logout */}
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

export default SettingsMenu;
