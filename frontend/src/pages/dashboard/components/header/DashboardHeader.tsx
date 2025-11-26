import { Search, Bell, Wifi, WifiOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QuickActions } from './QuickActions';
import { useState } from 'react';

interface DashboardHeaderProps {
    wsConnected: boolean;
}

/**
 * Top navigation bar for dashboard
 * Contains search, notifications, WebSocket status, and quick actions
 */
export function DashboardHeader({ wsConnected }: DashboardHeaderProps) {
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container h-full flex items-center justify-between gap-4 px-6">
        {/* Left: Title + Search */}
        <div className="flex items-center gap-4 flex-1">
        <h1 className="text-xl font-bold">Dashboard</h1>

        <div className="relative max-w-md flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
        type="search"
        placeholder="Search resources..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-10 pr-4"
        />
        </div>
        </div>

        {/* Right: Quick Actions + Notifications + Status */}
        <div className="flex items-center gap-3">
        {/* WebSocket Connection Status */}
        <div className="flex items-center gap-2">
        {wsConnected ? (
            <>
            <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-xs text-muted-foreground hidden sm:inline">
            Live
            </span>
            </>
        ) : (
            <>
            <WifiOff className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground hidden sm:inline">
            Offline
            </span>
            </>
        )}
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
        <Badge
        variant="destructive"
        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
        3
        </Badge>
        </Button>

        {/* Quick Actions Dropdown */}
        <QuickActions />
        </div>
        </div>
        </header>
    );
}
