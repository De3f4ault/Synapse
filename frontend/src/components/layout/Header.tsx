/**
 * Header - Synapse Command Deck (Unified Aesthetic)
 *
 * - Matches Chat Page "Pill" design
 * - Uses Theme Primary Colors
 * - Clean, floating layout
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Home, BookOpen, FileText, FileQuestion, MessageSquare,
    FileStack, Atom, Bell, User, Settings,
    LogOut, Moon, Sun, ChevronRight, Search,
    Grid, X, Plus,
    CreditCard, ClipboardList, Upload, Share2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { useWebSocket } from '@/api/websocket/hooks/useWebSocket';

interface HeaderProps {
    className?: string;
}

interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
    badge?: number;
}

const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: 'Flashcards', href: '/flashcards', icon: BookOpen },
    { label: 'Notes', href: '/notes', icon: FileText },
    { label: 'Docs', href: '/documents', icon: FileStack },
    { label: 'Quizzes', href: '/quizzes', icon: FileQuestion },
    { label: 'Chat', href: '/chat', icon: MessageSquare },
    { label: 'Graph', href: '/knowledge', icon: Share2 },
];

const quickActions = [
    { label: 'Create Deck', icon: CreditCard, href: '/flashcards', desc: 'Flashcards' },
    { label: 'Write Note', icon: BookOpen, href: '/notes', desc: 'Knowledge' },
    { label: 'Upload Doc', icon: Upload, href: '/documents', desc: 'Resource' },
    { label: 'Start Chat', icon: MessageSquare, href: '/chat', desc: 'AI Session' },
    { label: 'Create Quiz', icon: ClipboardList, href: '/quizzes', desc: 'Assessment' },
];

export function Header({ className }: HeaderProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const launcherRef = useRef<HTMLDivElement>(null);

    // State Management
    const { user, clearAuth } = useAuthStore();
    const { theme, toggleTheme } = useThemeStore();
    const { isConnected: wsConnected } = useWebSocket();

    const [controlPanelOpen, setControlPanelOpen] = useState(false);
    const [launcherOpen, setLauncherOpen] = useState(false);

    // Close menus on route change
    useEffect(() => {
        setControlPanelOpen(false);
        setLauncherOpen(false);
    }, [location.pathname]);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (launcherRef.current && !launcherRef.current.contains(event.target as Node)) {
                setLauncherOpen(false);
            }
        };
        if (launcherOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [launcherOpen]);

    const handleLogout = () => {
        clearAuth();
        navigate('/auth/login');
    };

    const displayName = user?.full_name || 'User';
    const displayEmail = user?.email || 'user@synapse.ai';

    return (
        <>
            {/* Main Header Bar */}
            <motion.header
                className={cn(
                    "h-20 flex items-center justify-between px-4 sm:px-6 z-40 relative pointer-events-none",
                    className
                )}
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
            >
                {/* 1. Brand + Mobile Launcher */}
                <div className="flex items-center gap-4 z-50 relative pointer-events-auto bg-black/20 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 shadow-2xl" ref={launcherRef}>
                    {/* Mobile Waffle Trigger */}
                    <button
                        onClick={() => setLauncherOpen(!launcherOpen)}
                        className={cn(
                            "lg:hidden p-2 rounded-full transition-all active:scale-95 border",
                            launcherOpen
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "hover:bg-white/5 text-slate-400 border-transparent"
                        )}
                    >
                        {launcherOpen ? <X className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
                    </button>

                    {/* Brand Identity */}
                    <button onClick={() => navigate('/dashboard')} className="flex items-center gap-3 group">
                        <div className="relative w-8 h-8 flex items-center justify-center">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 border-l-transparent"
                            />
                            <Atom className="w-5 h-5 text-cyan-400 relative z-10" />
                        </div>
                        <div className="hidden sm:flex flex-col">
                            <span className="font-sans text-lg text-white font-bold tracking-tight leading-none group-hover:text-cyan-400 transition-colors">
                                SYNAPSE
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={cn(
                                    "w-1.5 h-1.5 rounded-full animate-pulse",
                                    wsConnected ? "bg-emerald-500" : "bg-red-500"
                                )} />
                                <span className={cn(
                                    "text-[9px] font-mono uppercase tracking-wider leading-none",
                                    wsConnected ? "text-slate-400" : "text-red-400"
                                )}>
                                    {wsConnected ? "ONLINE" : "OFFLINE"}
                                </span>
                            </div>
                        </div>
                    </button>

                    {/* Mobile App Launcher */}
                    <AnimatePresence>
                        {launcherOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="absolute top-16 left-0 w-[300px] bg-[#0a0a0f]/95 border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden backdrop-blur-3xl"
                            >
                                <div className="p-3 border-b border-white/5">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Search apps..."
                                            className="w-full bg-white/5 rounded-md py-1.5 pl-8 pr-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all border border-transparent focus:border-cyan-500/20"
                                        />
                                    </div>
                                </div>
                                <div className="p-3 grid grid-cols-3 gap-2">
                                    {navItems.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <button
                                                key={item.href}
                                                onClick={() => navigate(item.href)}
                                                className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-white/5 transition-colors group"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-cyan-500/20 group-hover:text-cyan-400 transition-colors border border-white/5 group-hover:border-cyan-500/30">
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <span className="text-[10px] font-medium text-slate-500 group-hover:text-slate-300">
                                                    {item.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 2. Desktop Navigation Dock */}
                <nav className="hidden lg:flex items-center absolute left-1/2 -translate-x-1/2 pointer-events-auto">
                    <div className={cn(
                        "flex items-center gap-1 p-1.5 rounded-full border border-white/10 transition-all duration-500 shadow-2xl",
                        "bg-black/20 backdrop-blur-xl supports-[backdrop-filter]:bg-black/10"
                    )}>
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname.startsWith(item.href);

                            return (
                                <TooltipProvider key={item.href} delayDuration={0}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={() => navigate(item.href)}
                                                className={cn(
                                                    "relative px-5 py-3 rounded-full group transition-all duration-300",
                                                    isActive
                                                        ? "bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                                                        : "hover:bg-white/5 text-slate-400 hover:text-slate-200"
                                                )}
                                            >
                                                <Icon className="w-4 h-4" />
                                                {isActive && (
                                                    <span className="sr-only">(Active)</span>
                                                )}
                                                {item.badge && (
                                                    <span className="absolute top-2 right-2 flex h-1.5 w-1.5">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400"></span>
                                                    </span>
                                                )}
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="text-xs font-medium bg-black/90 border-white/10 text-white">
                                            {item.label}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            );
                        })}
                    </div>
                </nav>

                {/* 3. Right Actions */}
                <div className="flex items-center gap-3 z-50 pointer-events-auto bg-black/20 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 shadow-2xl">
                    {/* Search */}
                    <div
                        className="hidden md:flex items-center bg-white/5 border border-transparent rounded-full px-3 py-1.5 hover:bg-white/10 transition-all cursor-text group"
                        onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
                    >
                        <Search className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 mr-2" />
                        <span className="text-xs text-slate-500 group-hover:text-slate-300 font-medium mr-2">Search</span>
                        <kbd className="text-[9px] font-mono bg-black/40 px-1.5 rounded border border-white/10 text-slate-500">⌘K</kbd>
                    </div>

                    {/* Quick Actions */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-white/10 hover:text-cyan-400 text-slate-400">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 p-2 bg-[#0a0a0f]/95 border-white/10 backdrop-blur-3xl">
                            <DropdownMenuLabel className="text-xs font-medium text-slate-500 px-2 py-1.5 uppercase tracking-wider">
                                Quick Create
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/5" />
                            {quickActions.map((action) => {
                                const Icon = action.icon;
                                return (
                                    <DropdownMenuItem
                                        key={action.label}
                                        onClick={() => navigate(action.href)}
                                        className="gap-3 p-2 cursor-pointer focus:bg-white/5 focus:text-white group"
                                    >
                                        <div className="p-1.5 rounded-md bg-white/5 text-slate-400 group-focus:text-cyan-400 transition-colors">
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs font-medium text-slate-300 group-focus:text-white">{action.label}</div>
                                            <div className="text-[10px] text-slate-500">{action.desc}</div>
                                        </div>
                                    </DropdownMenuItem>
                                );
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Notifications */}
                    <button className="relative group p-2 rounded-full hover:bg-white/10 hover:text-cyan-400 transition-colors text-slate-400">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-cyan-500 rounded-full" />
                    </button>

                    {/* User Avatar - Control Panel Trigger */}
                    <button
                        onClick={() => setControlPanelOpen(true)}
                        className="flex items-center gap-2 pl-1 pr-1 py-1 rounded-full hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
                    >
                        <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400">
                            <User className="w-4 h-4" />
                        </div>
                    </button>
                </div>
            </motion.header>

            {/* Control Panel Slide-out */}
            <AnimatePresence>
                {controlPanelOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setControlPanelOpen(false)}
                            className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed top-0 right-0 bottom-0 z-[70] w-80 bg-card border-l border-border shadow-2xl flex flex-col"
                        >
                            {/* Header */}
                            <div className="h-20 flex items-center justify-between px-6 border-b border-border bg-muted/20">
                                <div>
                                    <h2 className="text-lg font-bold tracking-tight">Control Center</h2>
                                    <p className="text-xs text-muted-foreground">System settings & profile</p>
                                </div>
                                <button
                                    onClick={() => setControlPanelOpen(false)}
                                    className="p-2 hover:bg-muted rounded-full transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* User Profile */}
                                <div className="text-center">
                                    <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
                                        <User className="w-8 h-8 text-primary" />
                                    </div>
                                    <h3 className="font-bold">{displayName}</h3>
                                    <p className="text-sm text-muted-foreground">{displayEmail}</p>
                                </div>

                                <div className="space-y-1">
                                    <Button variant="outline" className="w-full justify-start gap-3" onClick={toggleTheme}>
                                        {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                                        Theme: {theme === 'dark' ? 'Dark' : 'Light'}
                                    </Button>
                                    <Button variant="outline" className="w-full justify-start gap-3" onClick={() => navigate('/settings')}>
                                        <Settings className="w-4 h-4" />
                                        Settings
                                    </Button>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-border bg-muted/20">
                                <Button
                                    variant="destructive"
                                    className="w-full gap-2"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
