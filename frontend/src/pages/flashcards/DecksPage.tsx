/**
 * DecksPage - Mnemosyne Protocol Hub
 * REFACTORED: Now with AI generation support
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, AlertTriangle, Sparkles, Wand2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDecks, useDeleteDeck } from './hooks/useDecks';
import { useGenerateFlashcards } from '@/api/hooks/useAIGeneration';
import { DeckList } from './components/deck/DeckList';
import { FloatingPageDock } from '@/components/layout/FloatingPageDock';

export function DecksPage() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [showGenerator, setShowGenerator] = useState(false);

    // Fetch decks
    const { data: decksData, isLoading, error, isError } = useDecks();
    const { mutate: deleteDeck } = useDeleteDeck();

    // Ensure decksData is an array
    const decks = Array.isArray(decksData) ? decksData : [];

    // Filter decks by search query (memoized)
    const filteredDecks = useMemo(() =>
        decks.filter((deck) =>
            deck.name.toLowerCase().includes(searchQuery.toLowerCase())
        ),
        [decks, searchQuery]
    );

    return (
        <div className="space-y-6 p-8 relative z-10">
            {/* Loading State */}
            {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-10">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-48 rounded-2xl bg-white/5 border border-white/5 animate-pulse" />
                    ))}
                </div>
            )}

            {/* Error State */}
            {isError && (
                <div className="flex flex-col items-center justify-center py-20">
                    <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                    <h2 className="text-xl font-bold text-foreground mb-2">Connection Error</h2>
                    <p className="text-muted-foreground font-mono text-sm mb-6 text-center max-w-md">
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
                    <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-bold text-foreground mb-2">
                        {searchQuery ? 'No decks found' : 'No decks created'}
                    </h2>
                    <p className="text-muted-foreground font-mono text-sm mb-6">
                        {searchQuery ? 'Try adjusting your search' : 'Create a deck manually or generate with AI'}
                    </p>
                </div>
            )}

            {/* Decks Grid */}
            {!isLoading && !isError && filteredDecks.length > 0 && (
                <div className="pb-24">
                    <DeckList
                        decks={filteredDecks}
                        onDeckClick={(id) => navigate(`/flashcards/${id}`)}
                        onDeckDelete={(id) => deleteDeck(id)}
                        onDeckEdit={(id) => navigate(`/flashcards/${id}/edit`)}
                        onDeckReview={(id) => navigate(`/flashcards/${id}/review`)}
                    />
                </div>
            )}

            <FloatingPageDock className="justify-between">
                {/* Search */}
                <div className="relative flex-1 max-w-md group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        value={searchQuery}
                        placeholder="Search decks..."
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 bg-transparent border-none outline-none pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus:ring-0"
                    />
                </div>

                <div className="h-6 w-px bg-border mx-2" />

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => setShowGenerator(true)}
                        size="sm"
                        className="rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-cyan-400 hover:text-cyan-300 border border-purple-500/30 hover:border-cyan-500/50"
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI GENERATE
                    </Button>
                    <Button
                        onClick={() => navigate('/flashcards/create')}
                        size="icon"
                        className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        <Plus className="w-5 h-5" />
                    </Button>
                </div>
            </FloatingPageDock>

            {/* AI Generator Modal */}
            <AnimatePresence>
                {showGenerator && (
                    <FlashcardGenerator
                        onClose={() => setShowGenerator(false)}
                        onSuccess={() => setShowGenerator(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================================================
// AI Flashcard Generator Modal
// ============================================================================

interface FlashcardGeneratorProps {
    onClose: () => void;
    onSuccess: () => void;
}

function FlashcardGenerator({ onClose, onSuccess }: FlashcardGeneratorProps) {
    const navigate = useNavigate();
    const [topic, setTopic] = useState('');
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [numCards, setNumCards] = useState(10);

    const generateFlashcards = useGenerateFlashcards();
    const generating = generateFlashcards.isPending;

    const handleCreate = async () => {
        if (!topic.trim()) return;

        generateFlashcards.mutate(
            {
                topic: topic.trim(),
                num_cards: numCards,
                difficulty: difficulty
            },
            {
                onSuccess: (data) => {
                    onSuccess();
                    // Navigate to the new deck
                    navigate(`/flashcards/${data.deck_id}`);
                }
            }
        );
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && topic.trim() && !generating) {
            handleCreate();
        }
        if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="synapse-panel max-w-lg w-full p-10 text-center space-y-6 relative"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white"
                >
                    <X size={20} />
                </button>

                <div>
                    <div className="w-16 h-16 mx-auto bg-purple-500/10 rounded-full flex items-center justify-center border border-purple-500/20 mb-6">
                        <Wand2 size={28} className="text-purple-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
                        Generate Flashcards
                    </h2>
                    <p className="text-slate-400 text-sm">
                        Enter a topic and AI will create flashcards for you.
                    </p>
                </div>

                <div className="space-y-4">
                    {/* Topic Input */}
                    <input
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="e.g. Spanish Vocabulary, React Hooks..."
                        className="synapse-input w-full text-center text-lg py-3 text-white bg-slate-900/50 border border-slate-700 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors"
                        disabled={generating}
                        autoFocus
                    />

                    {/* Difficulty Selection */}
                    <div className="flex gap-2 justify-center">
                        {(['easy', 'medium', 'hard'] as const).map((d) => (
                            <button
                                key={d}
                                onClick={() => setDifficulty(d)}
                                disabled={generating}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${difficulty === d
                                    ? d === 'easy'
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                                        : d === 'medium'
                                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                                            : 'bg-red-500/20 text-red-400 border border-red-500/50'
                                    : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
                                    }`}
                            >
                                {d.charAt(0).toUpperCase() + d.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Card Count */}
                    <div className="flex items-center justify-center gap-4">
                        <span className="text-slate-400 text-sm">Cards:</span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setNumCards(Math.max(5, numCards - 5))}
                                disabled={generating || numCards <= 5}
                                className="w-8 h-8 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-colors"
                            >
                                -
                            </button>
                            <span className="text-white font-medium w-8 text-center">{numCards}</span>
                            <button
                                onClick={() => setNumCards(Math.min(50, numCards + 5))}
                                disabled={generating || numCards >= 50}
                                className="w-8 h-8 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-colors"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 justify-center pt-2">
                    <button
                        onClick={onClose}
                        className="synapse-button text-slate-400 hover:text-white"
                        disabled={generating}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={generating || !topic.trim()}
                        className="synapse-button-primary synapse-button px-8 flex items-center gap-2"
                    >
                        {generating ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles size={14} />
                                Generate
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
