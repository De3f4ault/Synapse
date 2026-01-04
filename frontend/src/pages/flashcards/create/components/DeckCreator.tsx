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
                className="bg-[#0a0a0f] border border-white/10 rounded-2xl max-w-lg w-full p-10 text-center space-y-6 relative"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Header */}
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

                {/* Form */}
                <div className="space-y-4">
                    {/* Topic Input */}
                    <input
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="e.g. Spanish Vocabulary, React Hooks..."
                        className="w-full text-center text-lg py-3 px-4 text-white bg-[#0f0f16] border border-white/10 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors placeholder:text-slate-500"
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
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                                            : d === 'medium'
                                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                                                : 'bg-red-500/20 text-red-400 border border-red-500/50'
                                        : 'bg-[#0f0f16] text-slate-400 border border-white/10 hover:border-white/20'
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
                                onClick={() => setNumCards(Math.max(MIN_CARDS, numCards - 5))}
                                disabled={isGenerating || numCards <= MIN_CARDS}
                                className="w-8 h-8 rounded bg-[#0f0f16] border border-white/10 text-slate-300 hover:bg-white/5 disabled:opacity-50 transition-colors"
                            >
                                -
                            </button>
                            <span className="text-white font-medium w-8 text-center">
                                {numCards}
                            </span>
                            <button
                                onClick={() => setNumCards(Math.min(MAX_CARDS, numCards + 5))}
                                disabled={isGenerating || numCards >= MAX_CARDS}
                                className="w-8 h-8 rounded bg-[#0f0f16] border border-white/10 text-slate-300 hover:bg-white/5 disabled:opacity-50 transition-colors"
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
                        className="px-6 py-2.5 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                        disabled={isGenerating}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !topic.trim()}
                        className="px-8 py-2.5 rounded-xl bg-purple-600 text-white font-medium flex items-center gap-2 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
