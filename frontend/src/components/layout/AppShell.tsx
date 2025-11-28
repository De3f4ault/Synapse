/**
 * AppShell - Oracle Theme (Sidebar Removed)
 * "Neural Container" - Simplified layout with header-only navigation
 *
 * Location: components/layout/AppShell.tsx
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { cn } from '@/lib/utils';

/**
 * AppShell Component
 *
 * Provides the main layout structure:
 * - Fixed header at top with all navigation
 * - Full-height content area below
 * - No sidebar (consolidated into header)
 */

interface AppShellProps {
    children?: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    return (
        <div className="relative min-h-screen bg-[#020408] text-slate-200">
        {/* Header - Fixed at top */}
        <Header />

        {/* Main Content Area - Below header */}
        <main className="pt-16 h-screen overflow-hidden">
        {/* Render child routes or passed children */}
        {children || <Outlet />}
        </main>

        {/* Background Effects - Oracle Theme */}
        <div className="fixed inset-0 -z-10 pointer-events-none">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#020408] to-black" />

        {/* Noise texture */}
        <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />

        {/* Mystical particles */}
        <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
            <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-500/10 rounded-full animate-float"
            style={{
                left: `${Math.random() * 100}%`,
                                       top: `${Math.random() * 100}%`,
                                       animationDelay: `${Math.random() * 5}s`,
                                       animationDuration: `${5 + Math.random() * 5}s`,
            }}
            />
        ))}
        </div>
        </div>
        </div>
    );
}

export default AppShell;
