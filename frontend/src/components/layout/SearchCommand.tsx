import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';
import { useUIStore } from '@/stores/uiStore';
import {
    FileText,
    BookOpen,
    MessageSquare,
    FileQuestion,
    BarChart,
    Home,
    Settings,
    Search,
} from 'lucide-react';

/**
 * Search Command Palette
 *
 * Features:
 * - Global search (⌘K / Ctrl+K)
 * - Quick navigation
 * - Recent searches
 * - Fuzzy search
 * - Keyboard navigation
 */

interface SearchResult {
    id: string;
    title: string;
    description?: string;
    icon: React.ReactNode;
    href: string;
    category: 'navigation' | 'content' | 'actions';
}

export function SearchCommand() {
    const navigate = useNavigate();
    const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
    const [search, setSearch] = useState('');

    // Navigation items
    const navigationItems: SearchResult[] = [
        {
            id: 'dashboard',
            title: 'Dashboard',
            description: 'View your overview',
            icon: <Home className="h-4 w-4" />,
            href: '/dashboard',
            category: 'navigation',
        },
        {
            id: 'flashcards',
            title: 'Flashcards',
            description: 'Manage your decks',
            icon: <BookOpen className="h-4 w-4" />,
            href: '/flashcards',
            category: 'navigation',
        },
        {
            id: 'notes',
            title: 'Notes',
            description: 'Browse your notes',
            icon: <FileText className="h-4 w-4" />,
            href: '/notes',
            category: 'navigation',
        },
        {
            id: 'documents',
            title: 'Documents',
            description: 'View uploaded documents',
            icon: <FileText className="h-4 w-4" />,
            href: '/documents',
            category: 'navigation',
        },
        {
            id: 'quizzes',
            title: 'Quizzes',
            description: 'Take quizzes',
            icon: <FileQuestion className="h-4 w-4" />,
            href: '/quizzes',
            category: 'navigation',
        },
        {
            id: 'chat',
            title: 'Chat',
            description: 'AI study assistant',
            icon: <MessageSquare className="h-4 w-4" />,
            href: '/chat',
            category: 'navigation',
        },
        {
            id: 'analytics',
            title: 'Analytics',
            description: 'View your progress',
            icon: <BarChart className="h-4 w-4" />,
            href: '/analytics',
            category: 'navigation',
        },
        {
            id: 'settings',
            title: 'Settings',
            description: 'Configure your preferences',
            icon: <Settings className="h-4 w-4" />,
            href: '/settings',
            category: 'navigation',
        },
    ];

    // Quick actions
    const quickActions: SearchResult[] = [
        {
            id: 'new-deck',
            title: 'Create New Deck',
            icon: <BookOpen className="h-4 w-4" />,
            href: '/flashcards/create',
            category: 'actions',
        },
        {
            id: 'new-note',
            title: 'Create New Note',
            icon: <FileText className="h-4 w-4" />,
            href: '/notes/new',
            category: 'actions',
        },
        {
            id: 'upload-document',
            title: 'Upload Document',
            icon: <FileText className="h-4 w-4" />,
            href: '/documents',
            category: 'actions',
        },
        {
            id: 'start-review',
            title: 'Start Review Session',
            icon: <BookOpen className="h-4 w-4" />,
            href: '/flashcards/review',
            category: 'actions',
        },
    ];

    const allItems = [...navigationItems, ...quickActions];

    // Filter results based on search
    const filteredResults = allItems.filter((item) => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
            item.title.toLowerCase().includes(searchLower) ||
            item.description?.toLowerCase().includes(searchLower)
        );
    });

    // Group by category
    const navigationResults = filteredResults.filter((r) => r.category === 'navigation');
    const actionResults = filteredResults.filter((r) => r.category === 'actions');

    // Keyboard shortcut listener
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setCommandPaletteOpen(!commandPaletteOpen);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, [commandPaletteOpen, setCommandPaletteOpen]);

    const handleSelect = (href: string) => {
        setCommandPaletteOpen(false);
        setSearch('');
        navigate(href);
    };

    return (
        <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
        <CommandInput
        placeholder="Search or jump to..."
        value={search}
        onValueChange={setSearch}
        />
        <CommandList>
        <CommandEmpty>
        <div className="flex flex-col items-center justify-center py-6 text-center">
        <Search className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No results found</p>
        <p className="text-xs text-muted-foreground mt-1">
        Try searching for pages, actions, or content
        </p>
        </div>
        </CommandEmpty>

        {navigationResults.length > 0 && (
            <>
            <CommandGroup heading="Navigation">
            {navigationResults.map((item) => (
                <CommandItem
                key={item.id}
                value={item.title}
                onSelect={() => handleSelect(item.href)}
                className="flex items-center gap-2 cursor-pointer"
                >
                {item.icon}
                <div className="flex-1">
                <div className="font-medium">{item.title}</div>
                {item.description && (
                    <div className="text-xs text-muted-foreground">
                    {item.description}
                    </div>
                )}
                </div>
                </CommandItem>
            ))}
            </CommandGroup>
            {actionResults.length > 0 && <CommandSeparator />}
            </>
        )}

        {actionResults.length > 0 && (
            <CommandGroup heading="Quick Actions">
            {actionResults.map((item) => (
                <CommandItem
                key={item.id}
                value={item.title}
                onSelect={() => handleSelect(item.href)}
                className="flex items-center gap-2 cursor-pointer"
                >
                {item.icon}
                <span className="font-medium">{item.title}</span>
                </CommandItem>
            ))}
            </CommandGroup>
        )}
        </CommandList>
        </CommandDialog>
    );
}
