import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { SearchCommand } from './SearchCommand';
import { useUIStore } from '@/stores/uiStore';

interface AppShellProps {
    children: React.ReactNode;
}

/**
 * AppShell Component (ENHANCED)
 *
 * Main application layout with:
 * - Responsive sidebar with collapse state
 * - Smooth animations
 * - Persistent sidebar state
 * - Global search command palette
 * - Constrained content width for readability
 */
export function AppShell({ children }: AppShellProps) {
    const { sidebarOpen, sidebarCollapsed, setSidebarOpen, toggleSidebarCollapse } = useUIStore();

    // Load collapsed state from localStorage on mount
    useEffect(() => {
        const savedCollapsed = localStorage.getItem('sidebar-collapsed');
        if (savedCollapsed === 'true' && !sidebarCollapsed) {
            toggleSidebarCollapse();
        }
    }, []);

    // Save collapsed state to localStorage
    useEffect(() => {
        localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed));
    }, [sidebarCollapsed]);

    // Keyboard shortcut for sidebar (⌘B / Ctrl+B)
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'b' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                toggleSidebarCollapse();
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, [toggleSidebarCollapse]);

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
        {/* Sidebar */}
        <Sidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={toggleSidebarCollapse}
        />

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
        <motion.div
        className="mx-auto h-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
        layout
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
        {children}
        </motion.div>
        </main>
        </div>

        {/* Global Search Command Palette */}
        <SearchCommand />

        {/* Mobile Backdrop */}
        <AnimatePresence>
        {sidebarOpen && (
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
            />
        )}
        </AnimatePresence>
        </div>
    );
}
