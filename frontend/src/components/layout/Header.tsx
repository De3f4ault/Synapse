import { Button } from '@/components/ui/button';
import { Menu, Search, Command } from 'lucide-react';
import { UserMenu } from './UserMenu';
import { NotificationCenter } from './NotificationCenter';
import { useUIStore } from '@/stores/uiStore';

/**
 * Header Component (ENHANCED)
 *
 * Top navigation bar with:
 * - Mobile menu button
 * - Logo
 * - Global search trigger (⌘K)
 * - Notification center
 * - User menu with theme toggle
 */

interface HeaderProps {
    onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
    const { setSidebarOpen } = useUIStore();

    const triggerSearch = () => {
        // Dispatch custom event to open search command
        const event = new KeyboardEvent('keydown', {
            key: 'k',
            metaKey: true,
            bubbles: true,
        });
        document.dispatchEvent(event);
    };

    return (
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
        {/* Mobile menu button */}
        <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Toggle menu"
        >
        <Menu className="h-5 w-5" />
        </Button>

        {/* Logo */}
        <div className="flex items-center gap-2 font-semibold">
        <span className="text-xl">Synapse</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search Button (⌘K trigger) */}
        <Button
        variant="outline"
        className="hidden gap-2 sm:flex sm:w-64 justify-start text-muted-foreground"
        onClick={triggerSearch}
        >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left text-sm">Search...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
        <Command className="h-3 w-3" />K
        </kbd>
        </Button>

        {/* Mobile Search Icon */}
        <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        onClick={triggerSearch}
        aria-label="Open search"
        >
        <Search className="h-5 w-5" />
        </Button>

        {/* Notification Center */}
        <NotificationCenter />

        {/* User Menu */}
        <UserMenu />
        </header>
    );
}
