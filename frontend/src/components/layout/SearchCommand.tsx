import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
    BookOpen,
    MessageSquare,
    FileQuestion,
    BarChart,
    Home,
    Settings,
    Search,
    StickyNote,
    Files,
    Sparkles,
    Target,
} from 'lucide-react';

// API Service imports
import {
    DocumentsService,
    NotesService,
    FlashcardsService,
    QuizzesService,
} from '@/api/generated';
import type {
    DocumentResponse,
    NoteResponse,
    DeckResponse,
    QuizResponse,
} from '@/api/generated';

/**
 * ENHANCED Search Command Palette
 *
 * Features:
 * - Global search (⌘K / Ctrl+K)
 * - Real-time resource search (documents, notes, decks, quizzes)
 * - Cross-module quick actions
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
    resourceType?: 'document' | 'note' | 'deck' | 'quiz';
}

export function SearchCommand() {
    const navigate = useNavigate();
    const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
    const [search, setSearch] = useState('');

    // Fetch resources (only when command palette is open)
    const { data: documents } = useQuery({
        queryKey: ['documents'],
        queryFn: () => DocumentsService.listDocumentsApiV1DocumentsGet(undefined, 1, 100),
        enabled: commandPaletteOpen,
        staleTime: 1000 * 60 * 5,
    });

    const { data: notes } = useQuery({
        queryKey: ['notes'],
        queryFn: () => NotesService.listNotesApiV1NotesGet(undefined, undefined, 1, 100),
        enabled: commandPaletteOpen,
        staleTime: 1000 * 60 * 5,
    });

    const { data: decks } = useQuery({
        queryKey: ['decks'],
        queryFn: () => FlashcardsService.listDecksApiV1DecksGet(undefined, undefined, 1, 100),
        enabled: commandPaletteOpen,
        staleTime: 1000 * 60 * 5,
    });

    const { data: quizzes } = useQuery({
        queryKey: ['quizzes'],
        queryFn: () => QuizzesService.listQuizzesApiV1QuizzesGet(1, 100),
        enabled: commandPaletteOpen,
        staleTime: 1000 * 60 * 5,
    });

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
            icon: <StickyNote className="h-4 w-4" />,
            href: '/notes',
            category: 'navigation',
        },
        {
            id: 'documents',
            title: 'Documents',
            description: 'View uploaded documents',
            icon: <Files className="h-4 w-4" />,
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
            id: 'study',
            title: 'Study',
            description: 'Review and learn',
            icon: <Target className="h-4 w-4" />,
            href: '/study',
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

    // Quick actions (CREATE operations)
    const quickActions: SearchResult[] = [
        {
            id: 'new-deck',
            title: 'Create New Deck',
            description: 'Start a new flashcard deck',
            icon: <BookOpen className="h-4 w-4" />,
            href: '/flashcards/create',
            category: 'actions',
        },
        {
            id: 'new-note',
            title: 'Create New Note',
            description: 'Start taking notes',
            icon: <StickyNote className="h-4 w-4" />,
            href: '/notes/new',
            category: 'actions',
        },
        {
            id: 'upload-document',
            title: 'Upload Document',
            description: 'Add a new document',
            icon: <Files className="h-4 w-4" />,
            href: '/documents',
            category: 'actions',
        },
        {
            id: 'start-study',
            title: 'Start Study Session',
            description: 'Review due items',
            icon: <Target className="h-4 w-4" />,
            href: '/study',
            category: 'actions',
        },
        {
            id: 'new-chat',
            title: 'New Chat Session',
            description: 'Start AI conversation',
            icon: <MessageSquare className="h-4 w-4" />,
            href: '/chat/new',
            category: 'actions',
        },
    ];

    // Cross-module actions (AI-powered)
    const aiActions: SearchResult[] = [
        {
            id: 'ai-flashcards-from-doc',
            title: 'Generate Flashcards from Document',
            description: 'AI-powered card generation',
            icon: <Sparkles className="h-4 w-4" />,
            href: '/flashcards/create?from=document',
            category: 'actions',
        },
        {
            id: 'ai-quiz-from-note',
            title: 'Generate Quiz from Note',
            description: 'Turn notes into quizzes',
            icon: <Sparkles className="h-4 w-4" />,
            href: '/quizzes/create?from=note',
            category: 'actions',
        },
        {
            id: 'chat-with-doc',
            title: 'Chat with a Document',
            description: 'Open study mode chat',
            icon: <Sparkles className="h-4 w-4" />,
            href: '/chat?mode=study',
            category: 'actions',
        },
    ];

    // Transform resources into searchable items
    const contentItems: SearchResult[] = useMemo(() => {
        const items: SearchResult[] = [];

        // Documents
        if (Array.isArray(documents)) {
            items.push(
                ...documents.slice(0, 10).map((doc: DocumentResponse) => ({
                    id: `doc-${doc.id}`,
                    title: doc.filename,
                    description: `Document • ${doc.file_type} • ${new Date(doc.created_at).toLocaleDateString()}`,
                    icon: <Files className="h-4 w-4" />,
                    href: `/documents/${doc.id}`,
                    category: 'content' as const,
                    resourceType: 'document' as const,
                }))
            );
        }

        // Notes
        if (Array.isArray(notes)) {
            items.push(
                ...notes.slice(0, 10).map((note: NoteResponse) => ({
                    id: `note-${note.id}`,
                    title: note.title,
                    description: `Note • ${new Date(note.created_at).toLocaleDateString()}`,
                    icon: <StickyNote className="h-4 w-4" />,
                    href: `/notes/${note.id}`,
                    category: 'content' as const,
                    resourceType: 'note' as const,
                }))
            );
        }

        // Flashcard Decks
        if (Array.isArray(decks)) {
            items.push(
                ...decks.slice(0, 10).map((deck: DeckResponse) => ({
                    id: `deck-${deck.id}`,
                    title: deck.name,
                    description: `Deck • ${deck.card_count || 0} cards`,
                    icon: <BookOpen className="h-4 w-4" />,
                    href: `/flashcards/${deck.id}`,
                    category: 'content' as const,
                    resourceType: 'deck' as const,
                }))
            );
        }

        // Quizzes
        if (Array.isArray(quizzes)) {
            items.push(
                ...quizzes.slice(0, 10).map((quiz: QuizResponse) => ({
                    id: `quiz-${quiz.id}`,
                    title: quiz.title,
                    description: `Quiz • ${quiz.question_count || 0} questions`,
                    icon: <FileQuestion className="h-4 w-4" />,
                    href: `/quizzes/${quiz.id}`,
                    category: 'content' as const,
                    resourceType: 'quiz' as const,
                }))
            );
        }

        return items;
    }, [documents, notes, decks, quizzes]);

    // Combine all items
    const allItems = [...navigationItems, ...quickActions, ...aiActions, ...contentItems];

    // Filter results based on search
    const filteredResults = useMemo(() => {
        if (!search) {
            // Show nav + quick actions when no search
            return [...navigationItems, ...quickActions];
        }

        const searchLower = search.toLowerCase();
        return allItems.filter(
            (item) =>
                item.title.toLowerCase().includes(searchLower) ||
                item.description?.toLowerCase().includes(searchLower)
        );
    }, [search, allItems, navigationItems, quickActions]);

    // Group by category
    const navigationResults = filteredResults.filter((r) => r.category === 'navigation');
    const actionResults = filteredResults.filter((r) => r.category === 'actions');
    const contentResults = filteredResults.filter((r) => r.category === 'content');

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
                placeholder="Search pages, resources, or actions..."
                value={search}
                onValueChange={setSearch}
            />
            <CommandList>
                <CommandEmpty>
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        <Search className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No results found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Try searching for pages, documents, notes, or actions
                        </p>
                    </div>
                </CommandEmpty>

                {/* Navigation */}
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
                        {(actionResults.length > 0 || contentResults.length > 0) && (
                            <CommandSeparator />
                        )}
                    </>
                )}

                {/* Content (Documents, Notes, Decks, Quizzes) */}
                {contentResults.length > 0 && (
                    <>
                        <CommandGroup heading="Your Content">
                            {contentResults.map((item) => (
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

                {/* Actions */}
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
                                <div className="flex-1">
                                    <span className="font-medium">{item.title}</span>
                                    {item.description && (
                                        <div className="text-xs text-muted-foreground">
                                            {item.description}
                                        </div>
                                    )}
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}
            </CommandList>
        </CommandDialog>
    );
}
