/**
 * EditCardPage - Fragment Editor
 * REFACTORED: Uses FlashcardEditor with edit mode
 */

import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCard, useUpdateCard } from './hooks/useCards';
import { cn } from '@/lib/utils';
import type { FlashcardUpdateInput } from './types/flashcards.types';
import { Sparkles, X } from 'lucide-react';

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
            <div className="min-h-screen bg-[#020202] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            <p className="text-gray-400">Loading card...</p>
            </div>
            </div>
        );
    }

    // Error state
    if (error || !card) {
        return (
            <div className="min-h-screen bg-[#020202] p-6">
            <div className="max-w-2xl mx-auto">
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6">
            <h3 className="font-semibold text-red-500 mb-2">Error Loading Card</h3>
            <p className="text-sm text-gray-400 mb-4">{error?.message || 'Card not found'}</p>
            <Button onClick={() => navigate(`/flashcards/${deckId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Deck
            </Button>
            </div>
            </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020202] text-slate-200 relative overflow-hidden">
        {/* Noise Texture */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />

        {/* Ambient Gradients */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-900/10 blur-[150px] rounded-full opacity-50" />

        <div className="relative z-10 max-w-4xl mx-auto p-8 space-y-6">
        {/* Header */}
        <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
        >
        <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(`/flashcards/${deckId}`)}
        className="text-slate-500 hover:text-white hover:bg-white/5"
        >
        <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
        <h1 className="text-3xl font-serif font-bold text-white tracking-wide">
        Edit Memory Fragment
        </h1>
        <p className="text-slate-400 font-mono text-xs tracking-[0.2em] uppercase mt-1">
        MODIFY FLASHCARD DATA
        </p>
        </div>
        </motion.div>

        {/* Editor Card */}
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[rgba(10,10,10,0.6)] backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-2xl"
        >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Front Text */}
        <div className="space-y-2">
        <Label
        htmlFor="front_text"
        className="text-sm font-bold text-slate-300 uppercase tracking-wider"
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
            'bg-black/40 border-white/10 text-white focus:border-cyan-500/50 transition-colors resize-none',
            errors.front_text && 'border-red-500/50 focus:border-red-500'
        )}
        />
        {errors.front_text && (
            <p className="text-xs text-red-400">{errors.front_text.message}</p>
        )}
        </div>

        {/* Back Text */}
        <div className="space-y-2">
        <Label
        htmlFor="back_text"
        className="text-sm font-bold text-slate-300 uppercase tracking-wider"
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
            'bg-black/40 border-white/10 text-white focus:border-purple-500/50 transition-colors resize-none',
            errors.back_text && 'border-red-500/50 focus:border-red-500'
        )}
        />
        {errors.back_text && (
            <p className="text-xs text-red-400">{errors.back_text.message}</p>
        )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-white/5">
        <Button
        type="button"
        variant="outline"
        onClick={() => navigate(`/flashcards/${deckId}`)}
        className="flex-1 bg-white/5 hover:bg-white/10 border-white/10 text-white"
        >
        <X className="mr-2 h-4 w-4" />
        Cancel
        </Button>
        <Button
        type="submit"
        disabled={isPending || !isDirty}
        className="flex-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold"
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
        </Button>
        </div>
        </form>
        </motion.div>
        </div>
        </div>
    );
}
