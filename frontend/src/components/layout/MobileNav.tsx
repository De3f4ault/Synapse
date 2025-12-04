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
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * MobileNav Component
 *
 * Mobile navigation drawer with slide-in animation.
 * Displays same navigation items as desktop sidebar.
 */

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
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

interface MobileNavProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
    const navigate = useNavigate();
    const location = useLocation();

    const handleNavigation = (href: string) => {
        navigate(href);
        onOpenChange(false);
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-6 py-4">
        <SheetTitle className="text-xl font-bold">SYNAPSE</SheetTitle>
        </SheetHeader>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1 p-3">
        {navItems.map((item, index) => {
            const isActive = location.pathname.startsWith(item.href);

            return (
                <motion.div
                key={item.href}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                >
                <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                    'w-full justify-start gap-3 text-left',
                    isActive && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'
                )}
                onClick={() => handleNavigation(item.href)}
                >
                {item.icon}
                <span className="font-medium">{item.label}</span>
                </Button>
                </motion.div>
            );
        })}
        </nav>
        </SheetContent>
        </Sheet>
    );
}
