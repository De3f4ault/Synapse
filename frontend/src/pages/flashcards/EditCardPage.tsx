/**
 * EditCardPage - Fragment Editor
 * Neumorphic Design
 */

import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Sparkles, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCard, useUpdateCard } from './hooks/useCards';
import { cn } from '@/lib/utils';
import type { FlashcardUpdateInput } from './types/flashcards.types';
import { NeumorphicButton, NeumorphicCard } from '@/components/neumorphic';

export function EditCardPage() {
    const navigate = useNavigate();
    const { deckId, cardId } = useParams<{ deckId: string; cardId: string }>();

    // Fetch card data
    const { data: card, isLoading, error } = useCard(Number(cardId));

    // Update mutation
    const { mutate: updateCard, isPending } = useUpdateCard();

    const {
        register,
        handleSubmit,
        formState: { errors, isDirty },
    } = useForm<FlashcardUpdateInput>({
        values: card
            ? {
                front_text: card.front_text,
                back_text: card.back_text,
                front_media_url: card.front_media_url,
                back_media_url: card.back_media_url,
            }
            : undefined,
    });

    const onSubmit = (data: FlashcardUpdateInput) => {
        if (!cardId) return;
        updateCard(
            { cardId: Number(cardId), data },
            {
                onSuccess: () => navigate(`/flashcards/${deckId}`),
            }
        );
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen nm-bg flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                    <p className="text-slate-400">Loading card...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !card) {
        return (
            <div className="min-h-screen nm-bg p-6 flex items-center justify-center">
                <NeumorphicCard className="p-8 max-w-md w-full text-center">
                    <h3 className="font-semibold text-red-400 mb-2">Error Loading Card</h3>
                    <p className="text-sm text-slate-400 mb-6">{error?.message || 'Card not found'}</p>
                    <NeumorphicButton onClick={() => navigate(`/flashcards/${deckId}`)}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Deck
                    </NeumorphicButton>
                </NeumorphicCard>
            </div>
        );
    }

    return (
        <div className="min-h-screen nm-bg nm-constellation-bg flex flex-col items-center p-8 relative z-10">
            <div className="w-full max-w-3xl space-y-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4"
                >
                    <NeumorphicButton
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/flashcards/${deckId}`)}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </NeumorphicButton>
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">
                            Edit Memory Fragment
                        </h1>
                        <p className="text-slate-400 font-mono text-xs tracking-wider uppercase mt-1">
                            MODIFY FLASHCARD DATA
                        </p>
                    </div>
                </motion.div>

                {/* Editor Card */}
                <NeumorphicCard className="p-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {/* Front Text */}
                            <div className="space-y-2">
                                <Label
                                    htmlFor="front_text"
                                    className="text-xs font-bold text-slate-500 uppercase tracking-wider"
                                >
                                    Query Layer (Front) <span className="text-cyan-500">*</span>
                                </Label>
                                <Textarea
                                    id="front_text"
                                    rows={4}
                                    {...register('front_text', {
                                        required: 'Front text is required',
                                    })}
                                    className={cn(
                                        'nm-input w-full bg-transparent resize-none',
                                        errors.front_text && 'border-red-500/50 focus:border-red-500'
                                    )}
                                />
                                {errors.front_text && (
                                    <p className="text-xs text-red-400 mt-1">{errors.front_text.message}</p>
                                )}
                            </div>

                            {/* Back Text */}
                            <div className="space-y-2">
                                <Label
                                    htmlFor="back_text"
                                    className="text-xs font-bold text-slate-500 uppercase tracking-wider"
                                >
                                    Data Core (Back) <span className="text-purple-500">*</span>
                                </Label>
                                <Textarea
                                    id="back_text"
                                    rows={4}
                                    {...register('back_text', {
                                        required: 'Back text is required',
                                    })}
                                    className={cn(
                                        'nm-input w-full bg-transparent resize-none',
                                        errors.back_text && 'border-red-500/50 focus:border-red-500'
                                    )}
                                />
                                {errors.back_text && (
                                    <p className="text-xs text-red-400 mt-1">{errors.back_text.message}</p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t border-white/5">
                                <NeumorphicButton
                                    type="button"
                                    variant="ghost"
                                    onClick={() => navigate(`/flashcards/${deckId}`)}
                                    className="flex-1"
                                >
                                    <X className="mr-2 h-4 w-4" />
                                    Cancel
                                </NeumorphicButton>
                                <NeumorphicButton
                                    type="submit"
                                    disabled={isPending || !isDirty}
                                    variant="primary"
                                    className="flex-1"
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            Update Fragment
                                        </>
                                    )}
                                </NeumorphicButton>
                            </div>
                        </form>
                    </motion.div>
                </NeumorphicCard>
            </div>
        </div>
    );
}
