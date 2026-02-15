/**
 * FlashcardsHub.tsx
 * 
 * Central layout for the Flashcards module.
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Plus,
    Search,
    BrainCircuit,
    LayoutGrid,
    List as ListIcon,
    PanelLeftIcon,
    MenuIcon
} from 'lucide-react';

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
            className="group flex items-center gap-6 p-4 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all cursor-pointer"
        >
            <div className="p-3 rounded-lg bg-white/5 text-cyan-400 group-hover:scale-110 transition-transform">
                <BrainCircuit size={20} />
            </div>

            <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                    {deck.name}
                </h3>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                    <span>{deck.card_count || 0} cards</span>
                    <span>•</span>
                    <span>Updated {new Date(deck.updated_at).toLocaleDateString()}</span>
                </div>
            </div>

            <div className="hidden md:flex gap-2">
                {deck.tags?.slice(0, 3).map(tag => (
                    <span key={tag} className="px-2 py-1 rounded bg-black/20 text-xs text-slate-500 border border-white/5">
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
    onCreate,
    onAiGenerate,
    onImport,
    onDeckClick,
    onDeckDelete,
    onDeckEdit,
    onDeckReview
}: FlashcardsHubProps) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    // Load sidebar state from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("flashcardsSidebarCollapsed");
        if (saved) {
            setSidebarCollapsed(JSON.parse(saved));
        }
    }, []);

    const toggleSidebar = () => {
        const newState = !sidebarCollapsed;
        setSidebarCollapsed(newState);
        localStorage.setItem("flashcardsSidebarCollapsed", JSON.stringify(newState));
    };

    // Extract unique tags from decks for sidebar
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        decks.forEach(deck => {
            deck.tags?.forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet);
    }, [decks]);

    return (
        <div className="fixed inset-0 min-h-screen flex flex-col nm-bg nm-constellation-bg pt-16">

            <div className="flex flex-1 overflow-hidden">
                {/* Desktop Sidebar - Standardized Collapsible Pattern */}
                <div
                    className={cn(
                        "hidden lg:block transition-all duration-300 ease-in-out relative z-10 py-4 pl-3",
                        sidebarCollapsed ? "w-0 p-0" : "w-[17rem]",
                    )}
                >
                    <FlashcardsSidebar
                        activeFilter={activeFilter}
                        onFilterChange={onFilterChange}
                        totalDecks={decks.length}
                        tags={allTags}
                        onCreate={onCreate}
                        onAiGenerate={onAiGenerate}
                        className="w-full h-full rounded-2xl"
                        isCollapsed={sidebarCollapsed}
                    />
                </div>

                {/* Mobile Sidebar (Drawer) */}
                <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                    <SheetContent
                        side="left"
                        className="w-64 p-0 border-none [&>button]:hidden bg-[#050505]/95 backdrop-blur-xl"
                    >
                        <FlashcardsSidebar
                            activeFilter={activeFilter}
                            onFilterChange={onFilterChange}
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
                        {/* Desktop Toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleSidebar}
                            className="hidden lg:flex pointer-events-auto hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors"
                        >
                            <PanelLeftIcon className="size-5" />
                        </Button>

                        {/* Mobile Hamburger */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMobileSidebarOpen(true)}
                            className="lg:hidden pointer-events-auto hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors"
                        >
                            <MenuIcon className="size-5" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 pb-32 relative scrollbar-hide">
                        <div className="max-w-[1600px] mx-auto">
                            {/* Toolbar / Header */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pt-2 pl-12 lg:pl-0">
                                <div>
                                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                                        Neural Decks
                                    </h1>
                                    <p className="text-slate-400">
                                        Manage your knowledge network
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* View Toggle */}
                                    <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
                                        <button
                                            onClick={() => onViewChange('grid')}
                                            className={cn(
                                                "p-2 rounded-md transition-all",
                                                viewMode === 'grid' ? "bg-white/10 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                                            )}
                                        >
                                            <LayoutGrid size={18} />
                                        </button>
                                        <button
                                            onClick={() => onViewChange('list')}
                                            className={cn(
                                                "p-2 rounded-md transition-all",
                                                viewMode === 'list' ? "bg-white/10 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                                            )}
                                        >
                                            <ListIcon size={18} />
                                        </button>
                                    </div>

                                    {/* Search */}
                                    <div className="relative group">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                                        <input
                                            value={searchQuery}
                                            onChange={(e) => onSearchChange(e.target.value)}
                                            placeholder="Search decks..."
                                            className="pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:bg-black/40 transition-all w-64"
                                        />
                                    </div>

                                    {/* Create Button */}
                                    <button
                                        onClick={onCreate}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
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
                                        <div key={i} className="h-64 rounded-2xl bg-white/5 border border-white/5" />
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
    );
}
