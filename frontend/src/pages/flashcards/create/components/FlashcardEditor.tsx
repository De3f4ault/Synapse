/**
 * FlashcardEditor Component
 * 
 * Form for editing individual flashcard content.
 * Used in deck detail page for card management.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, RotateCcw } from 'lucide-react';
import type { Flashcard, FlashcardUpdateInput } from '../../core';

interface FlashcardEditorProps {
    card?: Flashcard;
    onSave: (data: FlashcardUpdateInput) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export function FlashcardEditor({
    card,
    onSave,
    onCancel,
    isLoading = false,
}: FlashcardEditorProps) {
    const [frontText, setFrontText] = useState(card?.front_text ?? '');
    const [backText, setBackText] = useState(card?.back_text ?? '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!frontText.trim() || !backText.trim()) return;

        onSave({
            front_text: frontText.trim(),
            back_text: backText.trim(),
        });
    };

    const handleReset = () => {
        setFrontText(card?.front_text ?? '');
        setBackText(card?.back_text ?? '');
    };

    const hasChanges =
        frontText !== (card?.front_text ?? '') || backText !== (card?.back_text ?? '');

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6"
            onClick={(e) => e.target === e.currentTarget && onCancel()}
        >
            <motion.form
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onSubmit={handleSubmit}
                className="bg-[#0a0a0f] border border-white/10 rounded-2xl max-w-2xl w-full p-8 space-y-6 relative"
            >
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">
                        {card ? 'Edit Flashcard' : 'Create Flashcard'}
                    </h2>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="text-slate-500 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Front Text */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-400">
                        Front (Question)
                    </label>
                    <textarea
                        value={frontText}
                        onChange={(e) => setFrontText(e.target.value)}
                        placeholder="Enter the question or prompt..."
                        className="w-full h-32 px-4 py-3 text-white bg-[#0f0f16] border border-white/10 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors resize-none placeholder:text-slate-500"
                        disabled={isLoading}
                    />
                </div>

                {/* Back Text */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-400">
                        Back (Answer)
                    </label>
                    <textarea
                        value={backText}
                        onChange={(e) => setBackText(e.target.value)}
                        placeholder="Enter the answer..."
                        className="w-full h-32 px-4 py-3 text-white bg-[#0f0f16] border border-white/10 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors resize-none placeholder:text-slate-500"
                        disabled={isLoading}
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                    <button
                        type="button"
                        onClick={handleReset}
                        disabled={!hasChanges || isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
                    >
                        <RotateCcw size={16} />
                        Reset
                    </button>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-2.5 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !frontText.trim() || !backText.trim()}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-600 text-white font-medium hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Save size={16} />
                            {isLoading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </motion.form>
        </motion.div>
    );
}
