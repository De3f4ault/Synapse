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
        <div className="min-h-screen bg-[#020202] text-slate-200 relative overflow-hidden">
        {/* Ambient Noise Texture */}
        <div className="absolute inset-0 z-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none" />

        <div className="relative z-10 space-y-6 p-8">
        {/* Header */}
        <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8"
        >
        <div>
        <h1 className="text-4xl font-serif font-bold text-white mb-2 tracking-wide">
        Mnemosyne Protocol
        </h1>
        <p className="text-slate-400 font-mono text-xs tracking-[0.2em] uppercase">
        SELECT A MEMORY CORE TO BEGIN IMPRINTING
        </p>
        </div>
        <Button
        onClick={() => navigate('/flashcards/create')}
        className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-sm font-bold text-white transition-all group"
        variant="ghost"
        >
        <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
        CONSTRUCT NEW CORE
        </Button>
        </motion.div>

        {/* Search Bar */}
        <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative max-w-md"
        >
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
        placeholder="Search memory cores..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-11 bg-black/40 border-white/5 text-white placeholder:text-slate-600 focus:border-cyan-500/50 transition-colors font-mono text-sm"
        />
        </motion.div>

        {/* Loading State */}
        {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 rounded-2xl bg-black/40 border border-white/5 animate-pulse" />
            ))}
            </div>
        )}

        {/* Error State */}
        {isError && (
            <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
            >
            <div className="relative mb-6">
            <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full" />
            <AlertTriangle className="h-16 w-16 text-red-500 relative z-10" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-white mb-2">Connection Error</h2>
            <p className="text-slate-400 font-mono text-sm mb-6 text-center max-w-md">
            {error instanceof Error ? error.message : 'Failed to load memory cores.'}
            </p>
            <Button
            onClick={() => navigate('/auth/login')}
            className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300"
            >
            Re-authenticate
            </Button>
            </motion.div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && filteredDecks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
            <Sparkles className="h-16 w-16 text-purple-500/50 mb-6" />
            <h2 className="text-2xl font-serif font-bold text-white mb-2">
            {searchQuery ? 'No cores found' : 'Initialization Required'}
            </h2>
            <p className="text-slate-400 font-mono text-sm mb-6">
            {searchQuery
                ? 'Try adjusting your search query'
        : 'Construct your first memory core to begin neural imprinting'}
        </p>
        {!searchQuery && (
            <Button
            onClick={() => navigate('/flashcards/create')}
            className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300"
            >
            <Plus className="mr-2 h-4 w-4" />
            CONSTRUCT CORE
            </Button>
        )}
        </div>
        )}

        {/* Decks Grid - Using DeckList Component */}
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
        </div>
    );
}
