/**
 * CreateCardPage - Card Creation
 * 
 * REFACTORED: Uses premium AuroraBackground and GlassCard.
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FlashcardsService } from '@/api/generated';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AuroraBackground } from '@/shared/ui';
import { GlassCard } from "@/shared/ui";
import type { FlashcardCreateInput } from './core';

export function CreateCardPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { deckId } = useParams<{ deckId: string }>();
    const id = parseInt(deckId || '0', 10);

    const [frontText, setFrontText] = useState('');
    const [backText, setBackText] = useState('');

    const { mutate: createCard, isPending } = useMutation({
        mutationFn: (data: FlashcardCreateInput) =>
            FlashcardsService.createCardApiV1CardsPost(data),
        onSuccess: () => {
            toast.success('Card created');
            queryClient.invalidateQueries({ queryKey: queryKeys.decks.cards(id) });
            navigate(`/flashcards/${id}`);
        },
        onError: (error) => {
            toast.error('Failed to create card', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
    });

    if (!id) {
        navigate('/flashcards');
        return null;
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!frontText.trim() || !backText.trim()) return;

        createCard({
            deck_id: id,
            front_text: frontText.trim(),
            back_text: backText.trim(),
        });
    };

    return (
        <AuroraBackground className="fixed inset-0 min-h-screen flex flex-col" fixed>
            {/* Top Bar */}
            <div className="flex-none h-16 border-b border-white/5 bg-black/20 backdrop-blur-xl z-20 px-8 flex items-center gap-4">
                <button
                    onClick={() => navigate(`/flashcards/${id}`)}
                    className="p-2 rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-sm font-bold text-white leading-none mb-1">Create New Card</h1>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Editor</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 relative z-10 flex flex-col items-center justify-start pt-16">
                <div className="w-full max-w-3xl space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        {/* Editor Card */}
                        <GlassCard className="p-8">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                {/* Front Text */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Front (Question) <span className="text-cyan-500">*</span>
                                        </Label>
                                        <span className="text-[10px] text-slate-600 bg-white/5 px-2 py-0.5 rounded">Markdown Supported</span>
                                    </div>
                                    <Textarea
                                        value={frontText}
                                        onChange={(e) => setFrontText(e.target.value)}
                                        placeholder="Enter the question or prompt..."
                                        rows={4}
                                        className={cn(
                                            'w-full min-h-[140px] resize-y px-5 py-4 rounded-xl',
                                            'bg-black/30 border border-white/10 text-white backdrop-blur-sm',
                                            'placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors',
                                            'text-lg font-medium'
                                        )}
                                    />
                                </div>

                                <div className="h-px bg-white/5 w-full" />

                                {/* Back Text */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Back (Answer) <span className="text-purple-500">*</span>
                                        </Label>
                                    </div>
                                    <Textarea
                                        value={backText}
                                        onChange={(e) => setBackText(e.target.value)}
                                        placeholder="Enter the answer..."
                                        rows={6}
                                        className={cn(
                                            'w-full min-h-[180px] resize-y px-5 py-4 rounded-xl',
                                            'bg-black/30 border border-white/10 text-white backdrop-blur-sm',
                                            'placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 transition-colors',
                                            'text-base leading-relaxed'
                                        )}
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex gap-4 pt-6 border-t border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/flashcards/${id}`)}
                                        className="flex-1 py-3.5 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors font-medium border border-transparent hover:border-white/10"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isPending || !frontText.trim() || !backText.trim()}
                                        className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20"
                                    >
                                        {isPending ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4" />
                                                Save Card
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </GlassCard>
                    </motion.div>
                </div>
            </div>
        </AuroraBackground>
    );
}
