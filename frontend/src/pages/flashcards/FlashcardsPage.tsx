/**
 * FlashcardsPage - Pure Orchestration
 * 
 * This component ONLY:
 * ✅ Imports from module public APIs
 * ✅ Wires modules together
 * ✅ Handles layout decisions
 * 
 * It does NOT:
 * ❌ Own business logic
 * ❌ Manage domain state
 * ❌ Make API calls directly
 * ❌ Define inline modals/components
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Plus, Search, Sparkles, AlertTriangle, Grid, AlignLeft, X, Upload } from 'lucide-react';

// Module public APIs only - no deep imports
import { useDecks, useDeleteDeck, DeckGrid, DeckTable, useDeckListStore } from './list';
import { DeckCreator } from './create';
import { EmptyState } from './shared';
import { ImportModal } from './components/ImportModal';
import type { Deck } from './core';

// Layout
import { FloatingPageDock } from '@/components/layout/FloatingPageDock';
import { cn } from '@/lib/utils';

/**
 * Main Flashcards Page - Deck Discovery
 */
export function FlashcardsPage() {
    const navigate = useNavigate();

    // UI state from list store
    const viewMode = useDeckListStore((s) => s.viewMode);
    const setViewMode = useDeckListStore((s) => s.setViewMode);
    const searchQuery = useDeckListStore((s) => s.searchQuery);
    const setSearchQuery = useDeckListStore((s) => s.setSearchQuery);

    // Local UI state (modal)
    const [showCreator, setShowCreator] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importDeckId, setImportDeckId] = useState<number | null>(null);

    // Data hooks
    const { data: decksData, isLoading, isError, error } = useDecks();
    const { mutate: deleteDeck } = useDeleteDeck();

    // Ensure decks is an array
    const decks: Deck[] = Array.isArray(decksData) ? decksData : [];

    // Filter decks by search
    const filteredDecks = useMemo(
        () =>
            decks.filter((deck) =>
                deck.name.toLowerCase().includes(searchQuery.toLowerCase())
            ),
        [decks, searchQuery]
    );

    // Handlers
    const handleDeckClick = (deckId: number) => navigate(`/flashcards/${deckId}`);
    const handleDeckEdit = (deckId: number) => navigate(`/flashcards/${deckId}/edit`);
    const handleDeckReview = (deckId: number) => navigate(`/flashcards/${deckId}/review`);
    const handleDeckDelete = (deckId: number) => {
        if (confirm('Delete this deck? This action cannot be undone.')) {
            deleteDeck(deckId);
        }
    };
    const handleCreatorSuccess = (deckId: number) => {
        setShowCreator(false);
        navigate(`/flashcards/${deckId}`);
    };

    return (
        <div className="relative min-h-screen nm-bg nm-constellation-bg overflow-hidden flex flex-col">
            {/* Top Bar: Search */}
            <div className="flex-none pt-8 pb-4 px-8 z-30">
                <div className="max-w-2xl mx-auto">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search decks..."
                            className="w-full h-12 bg-[#0a0a0f] border border-white/10 rounded-full pl-12 pr-12 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute inset-y-0 right-4 flex items-center text-slate-500 hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-8 pt-0 pb-32">
                {/* Loading State */}
                {isLoading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                        {[...Array(10)].map((_, i) => (
                            <div
                                key={i}
                                className="h-72 rounded-2xl bg-white/5 border border-white/5 animate-pulse"
                            />
                        ))}
                    </div>
                )}

                {/* Error State */}
                {isError && (
                    <EmptyState
                        icon={<AlertTriangle className="h-12 w-12" />}
                        title="Connection Error"
                        description={error instanceof Error ? error.message : "Failed to load decks."}
                        action={{
                            label: "Re-authenticate",
                            onClick: () => navigate("/auth/login"),
                        }}
                        variant="error"
                    />
                )}

                {/* Empty State */}
                {!isLoading && !isError && filteredDecks.length === 0 && (
                    <EmptyState
                        icon={<Sparkles className="h-12 w-12" />}
                        title={searchQuery ? "No decks found" : "No decks yet"}
                        description={
                            searchQuery
                                ? "Try adjusting your search"
                                : "Create your first deck to start learning!"
                        }
                        action={
                            !searchQuery
                                ? {
                                    label: "Create Deck",
                                    onClick: () => setShowCreator(true),
                                }
                                : undefined
                        }
                    />
                )}

                {/* Deck Grid/Table */}
                {!isLoading && !isError && filteredDecks.length > 0 && (
                    viewMode === 'grid' ? (
                        <DeckGrid
                            decks={filteredDecks}
                            onDeckClick={handleDeckClick}
                            onDeckDelete={handleDeckDelete}
                            onDeckEdit={handleDeckEdit}
                            onDeckReview={handleDeckReview}
                        />
                    ) : (
                        <DeckTable
                            decks={filteredDecks}
                            onDeckClick={handleDeckClick}
                            onDeckDelete={handleDeckDelete}
                            onDeckEdit={handleDeckEdit}
                            onDeckReview={handleDeckReview}
                        />
                    )
                )}
            </div>

            {/* Floating Dock */}
            <FloatingPageDock className="justify-between">
                {/* View Toggle */}
                <div className="flex bg-white/5 rounded-full p-0.5 border border-white/10">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            'p-2 rounded-full transition-all',
                            viewMode === 'grid'
                                ? 'bg-white/10 text-cyan-400'
                                : 'text-slate-500 hover:text-white'
                        )}
                    >
                        <Grid size={16} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            'p-2 rounded-full transition-all',
                            viewMode === 'list'
                                ? 'bg-white/10 text-cyan-400'
                                : 'text-slate-500 hover:text-white'
                        )}
                    >
                        <AlignLeft size={16} />
                    </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            // Open import modal - deck selector will be shown in modal
                            setImportDeckId(null);
                            setShowImportModal(true);
                        }}
                        className="h-10 px-5 rounded-full bg-slate-700/50 border border-white/10 text-slate-300 flex items-center gap-2 hover:bg-slate-700 transition-colors text-sm font-medium"
                    >
                        <Upload size={16} />
                        Import CSV
                    </button>
                    <button
                        onClick={() => setShowCreator(true)}
                        className="h-10 px-5 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-300 flex items-center gap-2 hover:bg-purple-600/30 transition-colors text-sm font-medium"
                    >
                        <Sparkles size={16} />
                        AI Generate
                    </button>
                    <button
                        onClick={() => navigate('/flashcards/create')}
                        className="h-10 px-5 rounded-full bg-cyan-600 text-white flex items-center gap-2 hover:bg-cyan-500 transition-colors text-sm font-bold shadow-lg shadow-cyan-500/20"
                    >
                        <Plus size={18} />
                        Create Deck
                    </button>
                </div>
            </FloatingPageDock>

            {/* AI Generator Modal */}
            <AnimatePresence>
                {showCreator && (
                    <DeckCreator
                        onClose={() => setShowCreator(false)}
                        onSuccess={handleCreatorSuccess}
                    />
                )}
            </AnimatePresence>

            {/* Import Modal */}
            <AnimatePresence>
                {showImportModal && (
                    <ImportModal
                        isOpen={showImportModal}
                        onClose={() => {
                            setShowImportModal(false);
                            setImportDeckId(null);
                        }}
                        deckId={importDeckId}
                        onImportSuccess={() => {
                            setShowImportModal(false);
                            setImportDeckId(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
