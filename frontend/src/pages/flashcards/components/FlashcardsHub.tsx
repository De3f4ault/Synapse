/**
 * FlashcardsHub.tsx
 * 
 * Central layout for the Flashcards module.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Search,
    BrainCircuit,
    LayoutGrid,
    List as ListIcon,
    MenuIcon,
    FolderOpen,
} from 'lucide-react';

import { CollectionsService } from '@/api/generated';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { EmptyState } from '@/shared/ui';
import { FlashcardsSidebar } from './FlashcardsSidebar';

import { DeckCard } from '../list/components/DeckCard';

import type { Deck } from '../core';

// ----------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------

interface FlashcardsHubProps {
    decks: Deck[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    viewMode: 'grid' | 'list';
    onViewChange: (mode: 'grid' | 'list') => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    activeFilter: string;
    onFilterChange: (filter: string) => void;
    /** null = show all decks */
    activeCollectionId: number | null;
    onCollectionChange: (id: number | null) => void;
    onCreate: () => void;
    onAiGenerate: () => void;
    onImport: () => void;
    onDeckClick: (id: number) => void;
    onDeckDelete: (id: number) => void;
    onDeckEdit: (id: number) => void;
    onDeckReview: (id: number) => void;
}

// ----------------------------------------------------------------------
// SUB-COMPONENTS
// ----------------------------------------------------------------------



function DeckListItem({
    deck,
    onClick
}: {
    deck: Deck;
    onClick: () => void;
}) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onClick}
            className="group flex items-center gap-6 p-4 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border transition-all cursor-pointer"
        >
            <div className="p-3 rounded-lg bg-foreground/5 text-primary group-hover:scale-110 transition-transform">
                <BrainCircuit size={20} />
            </div>

            <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-foreground group-hover:text-primary/80 transition-colors truncate">
                    {deck.name}
                </h3>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                    <span>{deck.card_count || 0} cards</span>
                    <span>•</span>
                    <span>Updated {new Date(deck.updated_at).toLocaleDateString()}</span>
                </div>
            </div>

            <div className="hidden md:flex gap-2">
                {deck.tags?.slice(0, 3).map(tag => (
                    <span key={tag} className="px-2 py-1 rounded bg-background/50 text-xs text-muted-foreground border border-border">
                        {tag}
                    </span>
                ))}
            </div>
        </motion.div>
    );
}

// ----------------------------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------------------------

export function FlashcardsHub({
    decks,
    isLoading,
    viewMode,
    onViewChange,
    searchQuery,
    onSearchChange,
    activeFilter,
    onFilterChange,
    activeCollectionId,
    onCollectionChange,
    onCreate,
    onAiGenerate,
    onImport,
    onDeckClick,
    onDeckDelete,
    onDeckEdit,
    onDeckReview
}: FlashcardsHubProps) {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const qc = useQueryClient();

    // Assign-to-collection modal state
    const [assignTarget, setAssignTarget] = useState<{ deck: Deck; currentCollectionId: number | null } | null>(null);

    // Collections list for the assign modal
    interface Collection { id: number; name: string; deck_count: number; }
    const { data: allCollections = [] } = useQuery<Collection[]>({
        queryKey: ['collections'],
        queryFn:  () => CollectionsService.listCollectionsApiV1CollectionsGet() as Promise<Collection[]>,
        staleTime: 60_000,
    });
    const assignMutation = useMutation({
        mutationFn: (vars: { deck_id: number; collection_id: number | null }) =>
            CollectionsService.assignDeckToCollectionApiV1CollectionsAssignPost(vars as any),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['collections'] }); setAssignTarget(null); },
    });

    // Extract unique tags from decks for sidebar
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        decks.forEach(deck => {
            deck.tags?.forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet);
    }, [decks]);

    return (
    <>
        <div className="fixed inset-0 min-h-screen flex flex-col bg-background text-foreground pt-16">

            <div className="flex flex-1 overflow-hidden">
                {/* Desktop Sidebar — SidebarShell handles its own collapse */}
                <div className="hidden lg:flex transition-all duration-300 ease-in-out relative z-10">
                    <FlashcardsSidebar
                        activeFilter={activeFilter}
                        onFilterChange={onFilterChange}
                        activeCollectionId={activeCollectionId}
                        onCollectionChange={onCollectionChange}
                        totalDecks={decks.length}
                        tags={allTags}
                        onCreate={onCreate}
                        onAiGenerate={onAiGenerate}
                    />
                </div>

                {/* Mobile Sidebar (Drawer) */}
                <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                    <SheetContent
                        side="left"
                        className="w-64 p-0 border-none [&>button]:hidden bg-background/95 backdrop-blur-xl"
                    >
                        <FlashcardsSidebar
                            activeFilter={activeFilter}
                            onFilterChange={onFilterChange}
                            activeCollectionId={activeCollectionId}
                            onCollectionChange={onCollectionChange}
                            totalDecks={decks.length}
                            tags={allTags}
                            onCreate={onCreate}
                            onAiGenerate={onAiGenerate}
                            className="w-64"
                        />
                    </SheetContent>
                </Sheet>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden relative z-0">
                    {/* Standardized Floating Sidebar Toggle */}
                    <div className="absolute top-4 left-4 z-50 flex items-center gap-2 pointer-events-none">
                        {/* Mobile Hamburger */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMobileSidebarOpen(true)}
                            className="lg:hidden pointer-events-auto hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-colors"
                        >
                            <MenuIcon className="size-5" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 pb-32 relative scrollbar-hide">
                        <div className="max-w-[1600px] mx-auto">
                            {/* Toolbar / Header */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pt-2 pl-12 lg:pl-0">
                                <div>
                                    <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">
                                        Neural Decks
                                    </h1>
                                    <p className="text-muted-foreground">
                                        Manage your knowledge network
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* View Toggle */}
                                    <div className="flex bg-foreground/5 rounded-lg p-1 border border-border">
                                        <button
                                            onClick={() => onViewChange('grid')}
                                            className={cn(
                                                "p-2 rounded-md transition-all",
                                                viewMode === 'grid' ? "bg-foreground/10 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground/80"
                                            )}
                                        >
                                            <LayoutGrid size={18} />
                                        </button>
                                        <button
                                            onClick={() => onViewChange('list')}
                                            className={cn(
                                                "p-2 rounded-md transition-all",
                                                viewMode === 'list' ? "bg-foreground/10 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground/80"
                                            )}
                                        >
                                            <ListIcon size={18} />
                                        </button>
                                    </div>

                                    {/* Search */}
                                    <div className="relative group">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                        <input
                                            value={searchQuery}
                                            onChange={(e) => onSearchChange(e.target.value)}
                                            placeholder="Search decks..."
                                            className="pl-10 pr-4 py-2.5 bg-background/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary/50 focus:bg-background/70 transition-all w-64"
                                        />
                                    </div>

                                    {/* Create Button */}
                                    <button
                                        onClick={onCreate}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary text-black font-bold rounded-xl transition-all shadow-lg  active:scale-95"
                                    >
                                        <Plus size={18} />
                                        <span className="hidden sm:inline">New Deck</span>
                                    </button>
                                </div>
                            </div>

                            {/* Content Area */}
                            {/* Content Area */}
                            {isLoading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
                                    {[...Array(8)].map((_, i) => (
                                        <div key={i} className="h-64 rounded-2xl bg-foreground/5 border border-border" />
                                    ))}
                                </div>
                            ) : decks.length > 0 ? (
                                viewMode === 'grid' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {decks.map((deck) => (
                                            <DeckCard
                                                key={deck.id}
                                                deck={deck}
                                                onClick={() => onDeckClick(deck.id)}
                                                onDelete={() => onDeckDelete(deck.id)}
                                                onEdit={() => onDeckEdit(deck.id)}
                                                onReview={() => onDeckReview(deck.id)}
                                                onMoveToCollection={() => setAssignTarget({
                                                    deck,
                                                    currentCollectionId: (deck as any).collection_id ?? null,
                                                })}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {decks.map(deck => (
                                            <DeckListItem
                                                key={deck.id}
                                                deck={deck}
                                                onClick={() => onDeckClick(deck.id)}
                                            />
                                        ))}
                                    </div>
                                )
                            ) : (
                                <div className="h-[60vh] flex items-center justify-center">
                                    <EmptyState
                                        title="No Decks Found"
                                        description="Your neural network is empty. Create a deck to start building connections."
                                        icon={BrainCircuit}
                                        action={{
                                            label: "Initialize First Deck",
                                            onClick: onCreate
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
            </div>
            </div>

        </div>

        {/* Assign to Collection Modal */}
        <AnimatePresence>
            {assignTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setAssignTarget(null)} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative bg-card border border-border rounded-2xl p-5 w-full max-w-sm shadow-2xl z-10"
                    >
                        <h2 className="text-sm font-bold text-foreground mb-1">Move to Collection</h2>
                        <p className="text-[11px] text-muted-foreground mb-4 line-clamp-1">"{assignTarget.deck.name}"</p>
                        <div className="space-y-1.5 max-h-72 overflow-y-auto">
                            <button
                                onClick={() => assignMutation.mutate({ deck_id: assignTarget.deck.id, collection_id: null })}
                                className={cn(
                                    'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors',
                                    assignTarget.currentCollectionId == null
                                        ? 'bg-primary/10 border border-primary/30 text-primary'
                                        : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground',
                                )}
                            >
                                <BrainCircuit size={14} /> Uncategorised
                            </button>
                            {allCollections.map((col) => (
                                <button
                                    key={col.id}
                                    onClick={() => assignMutation.mutate({ deck_id: assignTarget.deck.id, collection_id: col.id })}
                                    className={cn(
                                        'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors text-left',
                                        assignTarget.currentCollectionId === col.id
                                            ? 'bg-primary/10 border border-primary/30 text-primary'
                                            : 'hover:bg-muted/50 text-foreground',
                                    )}
                                >
                                    <FolderOpen size={14} />
                                    <span className="flex-1 truncate">{col.name}</span>
                                    <span className="text-[10px] text-muted-foreground">{col.deck_count}</span>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setAssignTarget(null)}
                            className="mt-4 w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Cancel
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </>);
}
