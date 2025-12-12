import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import {
    User,
    Settings,
    Sun,
    Moon,
    Laptop,
    Keyboard,
    HelpCircle,
    LogOut,
} from 'lucide-react';

/**
 * User Menu Component
 *
 * Features:
 * - User info display
 * - Profile & settings links
 * - Theme toggle (light/dark/system)
 * - Keyboard shortcuts modal trigger
 * - Help & support
 * - Logout
 */

export function UserMenu() {
    const navigate = useNavigate();
    const { user, clearAuth } = useAuthStore();
    const { theme, setTheme } = useThemeStore();

    const handleLogout = () => {
        clearAuth();
        navigate('/auth/login');
    };

    const getInitials = (email: string | undefined) => {
        if (!email) return 'U';
        return email
        .split('@')[0]
        .split('.')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    const getThemeIcon = () => {
        switch (theme) {
            case 'light':
                return <Sun className="h-4 w-4" />;
            case 'dark':
                return <Moon className="h-4 w-4" />;
            default:
                return <Laptop className="h-4 w-4" />;
        }
    };

    return (
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
        <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-primary text-primary-foreground">
        {getInitials(user?.email)}
        </AvatarFallback>
        </Avatar>
        </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="end" forceMount>
        {/* User Info */}
        <DropdownMenuLabel className="font-normal">
        <div className="flex flex-col space-y-1">
        <p className="text-sm font-medium leading-none">
        {user?.email?.split('@')[0] || 'User'}
        </p>
        <p className="text-xs leading-none text-muted-foreground">
        {user?.email || 'user@example.com'}
        </p>
        </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Profile */}
        <DropdownMenuItem onClick={() => navigate('/profile')}>
        <User className="mr-2 h-4 w-4" />
        <span>Profile</span>
        </DropdownMenuItem>

        {/* Settings */}
        <DropdownMenuItem onClick={() => navigate('/settings')}>
        <Settings className="mr-2 h-4 w-4" />
        <span>Settings</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Theme Submenu */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">
        Theme
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme('light')}>
        <Sun className="mr-2 h-4 w-4" />
        <span>Light</span>
        {theme === 'light' && (
            <span className="ml-auto">✓</span>
        )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
        <Moon className="mr-2 h-4 w-4" />
        <span>Dark</span>
        {theme === 'dark' && (
            <span className="ml-auto">✓</span>
        )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
        <Laptop className="mr-2 h-4 w-4" />
        <span>System</span>
        {theme === 'system' && (
            <span className="ml-auto">✓</span>
        )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Keyboard Shortcuts */}
        <DropdownMenuItem onClick={() => {/* TODO: Open shortcuts modal */}}>
        <Keyboard className="mr-2 h-4 w-4" />
        <span>Keyboard shortcuts</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
        ?
        </kbd>
        </DropdownMenuItem>

        {/* Help */}
        <DropdownMenuItem onClick={() => navigate('/help')}>
        <HelpCircle className="mr-2 h-4 w-4" />
        <span>Help & Support</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuItem
        onClick={handleLogout}
        className="text-destructive focus:text-destructive"
        >
        <LogOut className="mr-2 h-4 w-4" />
        <span>Log out</span>
        </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
    );
}
