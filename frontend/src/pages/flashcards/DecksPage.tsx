/**
 * DecksPage - Mnemosyne Protocol Hub
 * REFACTORED: Now uses modular components
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles } from 'lucide-react';
import { useDecks, useDeleteDeck } from './hooks/useDecks';
import { DeckList } from './components/deck/DeckList';

export function DecksPage() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch decks
    const { data: decksData, isLoading, error, isError } = useDecks();
    const { mutate: deleteDeck } = useDeleteDeck();

    // Ensure decksData is an array
    const decks = Array.isArray(decksData) ? decksData : [];

    // Filter decks by search query
    const filteredDecks = decks.filter((deck) =>
        deck.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 p-8 relative z-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Flashcards</h1>
                    <p className="text-slate-400 font-mono text-xs tracking-wider uppercase">
                        NEURAL MNEMONIC INTERFACE
                    </p>
                </div>
                <Button
                    onClick={() => navigate('/flashcards/create')}
                    className="synapse-button flex items-center gap-2"
                >
                    <Plus size={16} />
                    NEW DECK
                </Button>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                    placeholder="Search decks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="synapse-input w-full pl-10"
                />
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-48 rounded-2xl bg-white/5 border border-white/5 animate-pulse" />
                    ))}
                </div>
            )}

            {/* Error State */}
            {isError && (
                <div className="flex flex-col items-center justify-center py-20">
                    <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
                    <p className="text-slate-400 font-mono text-sm mb-6 text-center max-w-md">
                        {error instanceof Error ? error.message : 'Failed to load decks.'}
                    </p>
                    <Button
                        onClick={() => navigate('/auth/login')}
                        className="synapse-button text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                        variant="outline"
                    >
                        RE-AUTHENTICATE
                    </Button>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && !isError && filteredDecks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Sparkles className="h-12 w-12 text-slate-600 mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">
                        {searchQuery ? 'No decks found' : 'No decks created'}
                    </h2>
                    <p className="text-slate-400 font-mono text-sm mb-6">
                        {searchQuery ? 'Try adjusting your search' : 'Create a deck to start studying'}
                    </p>
                    {!searchQuery && (
                        <Button
                            onClick={() => navigate('/flashcards/create')}
                            className="synapse-button"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            CREATE DECK
                        </Button>
                    )}
                </div>
            )}

            {/* Decks Grid */}
            {!isLoading && !isError && filteredDecks.length > 0 && (
                <DeckList
                    decks={filteredDecks}
                    onDeckClick={(id) => navigate(`/flashcards/${id}`)}
                    onDeckDelete={(id) => deleteDeck(id)}
                    onDeckEdit={(id) => navigate(`/flashcards/${id}/edit`)}
                    onDeckReview={(id) => navigate(`/flashcards/${id}/review`)}
                />
            )}
        </div>
    );
}
