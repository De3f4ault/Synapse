import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Home,
    BookOpen,
    FileText,
    FileQuestion,
    MessageSquare,
    BarChart,
    FileStack,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Sidebar Component (ENHANCED)
 *
 * Navigation sidebar with:
 * - Active route highlighting
 * - Collapse/expand functionality
 * - Icons with tooltips in collapsed state
 * - Smooth transitions
 * - Due count badges for flashcards
 * - Mobile overlay
 */

interface SidebarProps {
    open: boolean;
    collapsed: boolean;
    onClose: () => void;
    onToggleCollapse: () => void;
}

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
    badge?: number; // Optional badge count
}

const navItems: NavItem[] = [
    {
        label: 'Dashboard',
        href: '/dashboard',
        icon: <Home className="h-5 w-5" />,
    },
{
    label: 'Flashcards',
    href: '/flashcards',
    icon: <BookOpen className="h-5 w-5" />,
    badge: 12, // Mock due count - replace with actual data
},
{
    label: 'Notes',
    href: '/notes',
    icon: <FileText className="h-5 w-5" />,
},
{
    label: 'Documents',
    href: '/documents',
    icon: <FileStack className="h-5 w-5" />,
},
{
    label: 'Quizzes',
    href: '/quizzes',
    icon: <FileQuestion className="h-5 w-5" />,
},
{
    label: 'Chat',
    href: '/chat',
    icon: <MessageSquare className="h-5 w-5" />,
},
{
    label: 'Analytics',
    href: '/analytics',
    icon: <BarChart className="h-5 w-5" />,
},
];

export function Sidebar({ open, collapsed, onClose, onToggleCollapse }: SidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();

    const handleNavigation = (href: string) => {
        navigate(href);
        if (window.innerWidth < 1024) {
            onClose();
        }
    };

    return (
        <>
        {/* Overlay for mobile */}
        {open && (
            <div
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
            onClick={onClose}
            />
        )}

        {/* Sidebar */}
        <motion.aside
        initial={false}
        animate={{
            width: collapsed ? 80 : 256,
        }}
        transition={{
            duration: 0.3,
            ease: 'easeInOut',
        }}
        className={cn(
            'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-950',
            'lg:translate-x-0 lg:static',
            open ? 'translate-x-0' : '-translate-x-full'
        )}
        >
        {/* Logo area - hidden on large screens when collapsed */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6 lg:hidden dark:border-slate-800">
        <span className="text-xl font-bold text-slate-900 dark:text-slate-50">
        SYNAPSE
        </span>
        </div>

        {/* Desktop Logo/Collapse Button */}
        <div className="hidden lg:flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
        {!collapsed && (
            <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xl font-bold text-slate-900 dark:text-slate-50"
            >
            SYNAPSE
            </motion.span>
        )}
        <Button
        variant="ghost"
        size="icon"
        onClick={onToggleCollapse}
        className="h-8 w-8"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
        {collapsed ? (
            <ChevronRight className="h-4 w-4" />
        ) : (
            <ChevronLeft className="h-4 w-4" />
        )}
        </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <TooltipProvider delayDuration={0}>
        {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.href);

            const button = (
                <Button
                key={item.href}
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                    'w-full justify-start gap-3 transition-all',
                    isActive && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary font-semibold',
                    collapsed && 'justify-center px-2'
                )}
                onClick={() => handleNavigation(item.href)}
                >
                <div className="relative">
                {item.icon}
                {item.badge && item.badge > 0 && !collapsed && (
                    <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground"
                    >
                    {item.badge > 9 ? '9+' : item.badge}
                    </motion.span>
                )}
                </div>
                {!collapsed && (
                    <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 text-left"
                    >
                    {item.label}
                    </motion.span>
                )}
                {!collapsed && item.badge && item.badge > 0 && (
                    <motion.span
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground"
                    >
                    {item.badge > 9 ? '9+' : item.badge}
                    </motion.span>
                )}
                </Button>
            );

            // Wrap in tooltip when collapsed
            if (collapsed) {
                return (
                    <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="right">
                    <p>{item.label}</p>
                    {item.badge && item.badge > 0 && (
                        <p className="text-xs text-muted-foreground">
                        {item.badge} due
                        </p>
                    )}
                    </TooltipContent>
                    </Tooltip>
                );
            }

            return button;
        })}
        </TooltipProvider>
        </nav>
        </motion.aside>
        </>
    );
}
