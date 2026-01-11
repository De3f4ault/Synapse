/**
 * FlashcardsHub.tsx
 * 
 * Central layout for the Flashcards module.
 * Incorporates the Neural/Aurora design.
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
import { AuroraBackground, EmptyState } from '@/shared/ui';
import GlassCard from '@/components/ui/GlassCard';
import { FlashcardsSidebar } from './FlashcardsSidebar';
import { FlashcardsDock } from './FlashcardsDock';

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

function DeckGridItem({
    deck,
    onClick
}: {
    deck: Deck;
    onClick: () => void;
}) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ duration: 0.2 }}
            onClick={onClick}
            className="group cursor-pointer"
        >
            <GlassCard className="h-full p-6 flex flex-col relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[50px] rounded-full group-hover:bg-cyan-500/20 transition-all duration-500" />

                {/* Header */}
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:border-cyan-500/30 transition-colors">
                        <BrainCircuit className="w-6 h-6 text-cyan-400" />
                    </div>
                    {deck.is_public && (
                        <span className="px-2 py-1 rounded-full bg-white/5 text-[10px] text-slate-400 font-mono uppercase tracking-wider border border-white/5">
                            Public
                        </span>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 relative z-10">
                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-cyan-300 transition-colors">
                        {deck.name}
                    </h3>
                    <p className="text-sm text-slate-400 line-clamp-2 mb-4 h-10">
                        {deck.description || "No description provided."}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {deck.tags?.slice(0, 3).map(tag => (
                            <span key={tag} className="text-xs text-slate-500 font-mono">#{tag}</span>
                        ))}
                    </div>
                </div>

                {/* Footer Stats */}
                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-500 font-mono relative z-10">
                    <span>{deck.card_count || 0} CARDS</span>
                </div>
            </GlassCard>
        </motion.div>
    );
}

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
    onDeckClick
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
        <AuroraBackground className="fixed inset-0 min-h-screen flex flex-col pt-16" fixed>

            <div className="flex flex-1 overflow-hidden">
                {/* Desktop Sidebar - Standardized Collapsible Pattern */}
                <div
                    className={cn(
                        "hidden lg:block transition-all duration-300 ease-in-out relative z-10",
                        sidebarCollapsed ? "w-0" : "w-64",
                    )}
                >
                    <FlashcardsSidebar
                        activeFilter={activeFilter}
                        onFilterChange={onFilterChange}
                        totalDecks={decks.length}
                        tags={allTags}
                        onCreate={onCreate}
                        onAiGenerate={onAiGenerate}
                        className="w-full"
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

                    <div className="flex-1 overflow-y-auto p-4 lg:p-8 pb-32 relative scrollbar-hide">
                        {/* Toolbar */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div className="pl-12 lg:pl-0">
                                <h1 className="text-2xl font-bold text-white tracking-tight mb-1">
                                    Neural Decks
                                </h1>
                                <p className="text-slate-400 text-sm">
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
                        {isLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-48 rounded-2xl bg-white/5 border border-white/5" />
                                ))}
                            </div>
                        ) : decks.length > 0 ? (
                            viewMode === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {decks.map(deck => (
                                        <DeckGridItem
                                            key={deck.id}
                                            deck={deck}
                                            onClick={() => onDeckClick(deck.id)}
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
                                    icon={<BrainCircuit className="w-16 h-16 text-slate-700" />}
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

            {/* Floating Dock */}
            <FlashcardsDock
                viewMode={viewMode}
                onViewChange={onViewChange}
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
                onImport={onImport}
            />

        </AuroraBackground>
    );
}
