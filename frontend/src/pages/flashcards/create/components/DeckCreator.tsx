/**
 * DeckCreator Component
 * 
 * Modal/form for creating decks - supports both manual and AI generation.
 * Uses solid dark styling per architecture constraints.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Wand2, Loader2, Sparkles } from 'lucide-react';
import { useFlashcardGenerator } from '../hooks';
import {
    DEFAULT_NUM_CARDS,
    DEFAULT_DIFFICULTY,
    MIN_CARDS,
    MAX_CARDS,
    type GeneratorDifficulty,
} from '../engine';

interface DeckCreatorProps {
    onClose: () => void;
    onSuccess: (deckId: number) => void;
}

export function DeckCreator({ onClose, onSuccess }: DeckCreatorProps) {
    const [topic, setTopic] = useState('');
    const [difficulty, setDifficulty] = useState<GeneratorDifficulty>(DEFAULT_DIFFICULTY);
    const [numCards, setNumCards] = useState(DEFAULT_NUM_CARDS);

    const { generate, isGenerating } = useFlashcardGenerator();

    const handleGenerate = () => {
        if (!topic.trim()) return;

        generate(
            {
                topic: topic.trim(),
                numCards,
                difficulty,
            },
            {
                onSuccess: (data) => {
                    onSuccess(data.deck_id);
                },
            }
        );
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && topic.trim() && !isGenerating) {
            handleGenerate();
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
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-popover border border-border rounded-2xl max-w-lg w-full p-10 text-center space-y-6 relative"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div>
                    <div className="w-16 h-16 mx-auto bg-accent/10 rounded-full flex items-center justify-center border border-accent/20 mb-6">
                        <Wand2 size={28} className="text-accent" />
                    </div>
                    <h2 className="text-3xl font-bold text-foreground mb-2 tracking-tight">
                        Generate Flashcards
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Enter a topic and AI will create flashcards for you.
                    </p>
                </div>

                {/* Form */}
                <div className="space-y-4">
                    {/* Topic Input */}
                    <input
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="e.g. Spanish Vocabulary, React Hooks..."
                        className="w-full text-center text-lg py-3 px-4 text-foreground bg-card border border-border rounded-xl focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors placeholder:text-muted-foreground"
                        disabled={isGenerating}
                        autoFocus
                    />

                    {/* Difficulty Selection */}
                    <div className="flex gap-2 justify-center">
                        {(['easy', 'medium', 'hard'] as const).map((d) => (
                            <button
                                key={d}
                                onClick={() => setDifficulty(d)}
                                disabled={isGenerating}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${difficulty === d
                                        ? d === 'easy'
                                            ? 'bg-accent-olive/20 text-accent-olive border border-emerald-500/50'
                                            : d === 'medium'
                                                ? 'bg-warning/20 text-warning border border-amber-500/50'
                                                : 'bg-destructive/20 text-destructive border border-destructive/50'
                                        : 'bg-card text-muted-foreground border border-border hover:border-border'
                                    }`}
                            >
                                {d.charAt(0).toUpperCase() + d.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Card Count */}
                    <div className="flex items-center justify-center gap-4">
                        <span className="text-muted-foreground text-sm">Cards:</span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setNumCards(Math.max(MIN_CARDS, numCards - 5))}
                                disabled={isGenerating || numCards <= MIN_CARDS}
                                className="w-8 h-8 rounded bg-card border border-border text-foreground/80 hover:bg-muted/50 disabled:opacity-50 transition-colors"
                            >
                                -
                            </button>
                            <span className="text-foreground font-medium w-8 text-center">
                                {numCards}
                            </span>
                            <button
                                onClick={() => setNumCards(Math.min(MAX_CARDS, numCards + 5))}
                                disabled={isGenerating || numCards >= MAX_CARDS}
                                className="w-8 h-8 rounded bg-card border border-border text-foreground/80 hover:bg-muted/50 disabled:opacity-50 transition-colors"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-center pt-2">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl text-muted-foreground hover:text-foreground bg-foreground/5 hover:bg-muted transition-colors"
                        disabled={isGenerating}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !topic.trim()}
                        className="px-8 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} />
                                Generate
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
