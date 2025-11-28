/**
 * Header - Synapse Command Deck (Waffle Launcher Edition)
 * FIXED VERSION - Uses Real Auth & Theme Stores
 *
 * Features:
 * - Desktop: Central "Floating Dock" navigation.
 * - Mobile: Microsoft-style "App Matrix" dropdown (Top-left Waffle Menu).
 * - System: Slide-out Control Matrix for user settings.
 * - Theme: "Quantum" High-Contrast Dark Mode.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Home, BookOpen, FileText, FileQuestion, MessageSquare,
    BarChart, FileStack, Atom, Bell, User, Settings,
    LogOut, Moon, Sun, ChevronRight, Search,
    Grid, Activity, Cpu, Shield, Wifi, MoreHorizontal,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';

interface HeaderProps {
    className?: string;
}

interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
    badge?: number;
    color: string;
}

const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: Home, color: 'cyan' },
{ label: 'Flashcards', href: '/flashcards', icon: BookOpen, badge: 12, color: 'purple' },
{ label: 'Notes', href: '/notes', icon: FileText, color: 'emerald' },
{ label: 'Docs', href: '/documents', icon: FileStack, color: 'blue' },
{ label: 'Quizzes', href: '/quizzes', icon: FileQuestion, color: 'amber' },
{ label: 'Chat', href: '/chat', icon: MessageSquare, color: 'cyan' },
{ label: 'Data', href: '/analytics', icon: BarChart, color: 'pink' },
];

export function Header({ className }: HeaderProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const launcherRef = useRef<HTMLDivElement>(null);

    // REAL STORES - FIXED
    const { user, clearAuth } = useAuthStore();
    const { theme, toggleTheme } = useThemeStore();

    // State
    const [controlPanelOpen, setControlPanelOpen] = useState(false);
    const [launcherOpen, setLauncherOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    // Scroll Effect
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close menus on route change or outside click
    useEffect(() => {
        setControlPanelOpen(false);
        setLauncherOpen(false);
    }, [location.pathname]);

    // Click outside handler for launcher
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (launcherRef.current && !launcherRef.current.contains(event.target as Node)) {
                setLauncherOpen(false);
            }
        };
        if (launcherOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [launcherOpen]);

    // Lock Body Scroll only for Control Panel (Launcher is dropdown now)
    useEffect(() => {
        if (controlPanelOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [controlPanelOpen]);

    // REAL LOGOUT - FIXED
    const handleLogout = () => {
        clearAuth();
        navigate('/auth/login');
    };

    // User display values with fallbacks
    const displayName = user?.full_name || 'User';
    const displayEmail = user?.email || 'user@synapse.ai';

    return (
        <>
        {/* --- MAIN HEADER BAR --- */}
        <motion.header
        className={cn(
            "fixed top-0 left-0 right-0 z-40 h-20 flex items-center justify-between px-4 sm:px-8 transition-all duration-500",
            isScrolled
            ? "bg-[#030303]/90 backdrop-blur-xl border-b border-white/10 h-16 shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
            : "bg-transparent"
        )}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
        {/* 1. BRAND IDENTITY + MOBILE LAUNCHER */}
        <div className="flex items-center gap-4 z-50 relative" ref={launcherRef}>

        {/* Mobile "Waffle" Trigger */}
        <button
        onClick={() => setLauncherOpen(!launcherOpen)}
        className={cn(
            "lg:hidden p-2.5 rounded-lg transition-all active:scale-95 border",
            launcherOpen
            ? "bg-cyan-950/30 text-cyan-400 border-cyan-500/30"
            : "bg-white/5 text-slate-200 border-white/10 hover:bg-white/10"
        )}
        aria-label="App Launcher"
        >
        {launcherOpen ? <X className="w-6 h-6" /> : <Grid className="w-6 h-6" />}
        </button>

        {/* Desktop Brand */}
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-4 group">
        <div className="relative w-10 h-10 flex items-center justify-center">
        <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 border-l-transparent"
        />
        <div className="absolute inset-0 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/30 transition-colors duration-500" />
        <Atom className="w-6 h-6 text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] relative z-10" />
        </div>
        <div className="hidden sm:flex flex-col">
        <span className="font-sans text-xl text-white font-black tracking-[0.1em] leading-none drop-shadow-md">
        SYNAPSE
        </span>
        <div className="flex items-center gap-2 mt-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-mono text-cyan-300/80 uppercase tracking-[0.2em] leading-none">
        Systems Online
        </span>
        </div>
        </div>
        </button>

        {/* --- MICROSOFT-STYLE APP LAUNCHER DROPDOWN --- */}
        <AnimatePresence>
        {launcherOpen && (
            <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-16 left-0 w-[340px] bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden"
            >
            {/* Launcher Header / Search */}
            <div className="p-4 border-b border-white/5">
            <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400" />
            <input
            type="text"
            placeholder="Search apps..."
            className="w-full bg-white/5 border border-white/5 rounded-md py-2 pl-9 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all"
            />
            </div>
            </div>

            {/* App Grid */}
            <div className="p-4 grid grid-cols-3 gap-y-6 gap-x-2 max-h-[60vh] overflow-y-auto">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.href);
                return (
                    <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className="flex flex-col items-center gap-2 group p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                    <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg",
                        isActive
                        ? `bg-${item.color}-500/20 text-${item.color}-400 border border-${item.color}-500/30`
                        : "bg-[#151515] text-slate-400 border border-white/5 group-hover:bg-white/10 group-hover:text-white group-hover:scale-105"
                    )}>
                    <Icon className="w-6 h-6" />
                    </div>
                    <span className={cn(
                        "text-[11px] font-medium text-center leading-tight",
                        isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                    )}>
                    {item.label}
                    </span>
                    </button>
                );
            })}

            {/* 'More Apps' Placeholder */}
            <button className="flex flex-col items-center gap-2 group p-2 rounded-lg hover:bg-white/5 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-[#151515] text-slate-500 border border-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:text-white transition-all">
            <MoreHorizontal className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-300 text-center">
            All Apps
            </span>
            </button>
            </div>

            {/* Footer Link */}
            <div className="p-3 bg-white/5 text-center border-t border-white/5">
            <button
            onClick={() => { setLauncherOpen(false); setControlPanelOpen(true); }}
            className="text-xs text-cyan-500 hover:text-cyan-400 font-medium hover:underline"
            >
            Manage System Preferences &rarr;
            </button>
            </div>
            </motion.div>
        )}
        </AnimatePresence>
        </div>

        {/* 2. FLOATING DOCK (Desktop) */}
        <nav className="hidden lg:flex items-center absolute left-1/2 -translate-x-1/2 perspective-[1000px]">
        <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-2xl border border-white/10 transition-all duration-500 shadow-2xl",
            isScrolled
            ? "bg-black/60 backdrop-blur-2xl border-white/20 shadow-[0_0_30px_rgba(0,0,0,0.8)]"
            : "bg-[#0a0a0a]/80 backdrop-blur-md"
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
                    "relative px-5 py-3 rounded-xl group transition-all duration-300 overflow-hidden",
                    isActive ? "bg-white/10" : "hover:bg-white/5"
                )}
                >
                <div className="flex items-center gap-2 relative z-10">
                <Icon className={cn(
                    "w-5 h-5 transition-all duration-300 filter",
                    isActive
                    ? `text-${item.color}-300 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]`
                    : "text-slate-300 group-hover:text-white"
                )} />
                </div>

                {/* Active Glow/Floor */}
                {isActive && (
                    <motion.div
                    layoutId="navGlow"
                    className={cn(
                        "absolute bottom-0 left-0 right-0 h-0.5 shadow-[0_-5px_15px_rgba(255,255,255,0.3)]",
                                  `bg-${item.color}-400`
                    )}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                )}

                {/* Notification Dot */}
                {item.badge && (
                    <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                )}
                </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-[#111] border-white/20 text-white font-mono text-xs tracking-wider px-3 py-2">
                {item.label}
                </TooltipContent>
                </Tooltip>
                </TooltipProvider>
            );
        })}
        </div>
        </nav>

        {/* 3. RIGHT ACTIONS */}
        <div className="flex items-center gap-3 md:gap-6 z-50">

        {/* Search Pill - Brighter */}
        <div
        className="hidden md:flex items-center bg-white/10 border border-white/20 rounded-full px-4 py-2 hover:border-cyan-400/50 hover:bg-white/15 transition-all cursor-text group shadow-lg"
        onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
        >
        <Search className="w-4 h-4 text-slate-300 group-hover:text-cyan-300 mr-3" />
        <span className="text-xs text-slate-300 group-hover:text-white font-mono mr-3 tracking-wide">SEARCH_DB</span>
        <kbd className="text-[9px] font-mono bg-black/60 px-1.5 py-0.5 rounded text-cyan-500 border border-white/10 font-bold">⌘K</kbd>
        </div>

        {/* Bell */}
        <button className="relative group p-2 rounded-full hover:bg-white/10 transition-colors">
        <Bell className="w-5 h-5 text-slate-200 group-hover:text-white transition-colors" />
        <span className="absolute top-2 right-2.5 w-2 h-2 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_8px_cyan]" />
        </button>

        {/* AVATAR - Trigger for Control Matrix */}
        <button
        onClick={() => setControlPanelOpen(true)}
        className="flex items-center gap-3 pl-1 pr-1 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/50 transition-all group shadow-xl"
        >
        <div className="flex flex-col items-end hidden md:flex pl-3">
        <span className="text-xs font-bold text-white tracking-widest group-hover:text-cyan-300 transition-colors">
        {displayName.toUpperCase()}
        </span>
        <span className="text-[9px] text-emerald-400 font-mono uppercase tracking-wider">
        Connected
        </span>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-600 via-blue-600 to-purple-600 p-[2px] group-hover:rotate-180 transition-transform duration-700 ease-out">
        <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
        <User className="w-5 h-5 text-white" />
        </div>
        </div>
        </button>
        </div>
        </motion.header>


        {/* --- SLIDE-OUT CONTROL MATRIX (Side Panel) --- */}
        <AnimatePresence>
        {controlPanelOpen && (
            <>
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setControlPanelOpen(false)}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            />

            <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-[70] w-80 md:w-96 bg-[#050505] border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.7)] flex flex-col"
            >
            {/* Panel Header */}
            <div className="h-24 flex items-center justify-between px-8 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
            <div>
            <div className="text-[10px] font-mono text-cyan-500 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
            Secure Channel
            </div>
            <h2 className="text-2xl font-bold text-white tracking-wide">COMMAND</h2>
            </div>
            <button
            onClick={() => setControlPanelOpen(false)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
            >
            <ChevronRight className="w-6 h-6" />
            </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
            {/* User Card */}
            <div className="relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 p-6 group">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-500 p-[3px] mb-4 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
            <User className="w-10 h-10 text-white" />
            </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">{displayName}</h3>
            <p className="text-sm text-cyan-300 font-mono mb-4">{displayEmail}</p>
            <div className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-slate-300">
            Level 4 Clearance
            </div>
            </div>
            </div>

            {/* Stats Grid */}
            <div>
            <h4 className="text-xs font-mono uppercase text-slate-500 tracking-widest mb-4 ml-1">System Diagnostics</h4>
            <div className="grid grid-cols-2 gap-3">
            {[
                { label: 'Uptime', val: '99.9%', icon: Activity, color: 'emerald' },
                { label: 'Latency', val: '12ms', icon: Wifi, color: 'cyan' },
                { label: 'Load', val: '42%', icon: Cpu, color: 'amber' },
                { label: 'Shield', val: 'Active', icon: Shield, color: 'purple' },
            ].map((stat) => (
                <div key={stat.label} className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors">
                <div className="flex items-center justify-between mb-2">
                <stat.icon className={`w-4 h-4 text-${stat.color}-400`} />
                </div>
                <div className="text-xl font-bold text-white">{stat.val}</div>
                <div className="text-[10px] font-mono text-slate-500 uppercase">{stat.label}</div>
                </div>
            ))}
            </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase text-slate-500 tracking-widest mb-2 ml-1">Configuration</h4>
            <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group"
            >
            <span className="flex items-center gap-3 text-sm font-bold text-slate-300 group-hover:text-white">
            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            Interface Theme
            </span>
            <span className="text-[10px] font-mono text-cyan-500 bg-cyan-950/30 px-2 py-1 rounded border border-cyan-500/20">
            {theme === 'dark' ? 'DARK' : theme === 'light' ? 'LIGHT' : 'SYSTEM'}
            </span>
            </button>

            <button
            onClick={() => navigate('/settings')}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group"
            >
            <span className="flex items-center gap-3 text-sm font-bold text-slate-300 group-hover:text-white">
            <Settings className="w-4 h-4" />
            Global Settings
            </span>
            </button>
            </div>
            </div>

            <div className="p-8 border-t border-white/10">
            <button
            onClick={handleLogout}
            className="w-full py-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 transition-all font-bold tracking-wide text-sm flex items-center justify-center gap-2"
            >
            <LogOut className="w-4 h-4" />
            TERMINATE SESSION
            </button>
            </div>
            </motion.div>
            </>
        )}
        </AnimatePresence>
        </>
    );
}
