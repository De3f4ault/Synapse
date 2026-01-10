/**
 * EditCardPage - Card Editor
 * 
 * REFACTORED: Uses modular imports.
 */

import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Sparkles, X, Brain } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlashcardsService } from '@/api/generated';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Module imports
import { DarkCard, EmptyState } from './shared';
import type { FlashcardUpdateInput, Flashcard } from './core';

export function EditCardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { deckId, cardId } = useParams<{ deckId: string; cardId: string }>();

  // Fetch card data
  const { data: card, isLoading, error } = useQuery({
    queryKey: queryKeys.flashcards.detail(Number(cardId)),
    queryFn: () => FlashcardsService.getCardApiV1CardsCardIdGet(Number(cardId)),
    enabled: !!cardId,
  });

  // Update mutation
  const { mutate: updateCard, isPending } = useMutation({
    mutationFn: ({ cardId, data }: { cardId: number; data: FlashcardUpdateInput }) =>
      FlashcardsService.updateCardApiV1CardsCardIdPut(cardId, data),
    onSuccess: () => {
      toast.success('Card updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.decks.cards(Number(deckId)) });
      navigate(`/flashcards/${deckId}`);
    },
    onError: (error) => {
      toast.error('Failed to update card', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  const typedCard = card as Flashcard | undefined;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FlashcardUpdateInput>({
    values: typedCard
      ? {
        front_text: typedCard.front_text,
        back_text: typedCard.back_text,
        front_media_url: typedCard.front_media_url,
        back_media_url: typedCard.back_media_url,
      }
      : undefined,
  });

  const onSubmit = (data: FlashcardUpdateInput) => {
    if (!cardId) return;
    updateCard({ cardId: Number(cardId), data });
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
  if (error || !typedCard) {
    return (
      <div className="min-h-screen nm-bg p-6 flex items-center justify-center">
        <EmptyState
          icon={<Brain className="h-12 w-12" />}
          title="Card Not Found"
          description={error instanceof Error ? error.message : "Card not found"}
          action={{
            label: "Back to Deck",
            onClick: () => navigate(`/flashcards/${deckId}`),
          }}
          variant="error"
        />
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
          <button
            onClick={() => navigate(`/flashcards/${deckId}`)}
            className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Edit Card
            </h1>
            <p className="text-slate-400 font-mono text-xs tracking-wider uppercase mt-1">
              MODIFY FLASHCARD DATA
            </p>
          </div>
        </motion.div>

        {/* Editor Card */}
        <DarkCard padding="lg">
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {/* Front Text */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Front (Question) <span className="text-cyan-500">*</span>
              </Label>
              <Textarea
                {...register('front_text', { required: 'Front text is required' })}
                rows={4}
                className={cn(
                  'w-full min-h-[100px] resize-y px-4 py-3 rounded-xl',
                  'bg-[#0f0f16] border border-white/10 text-white',
                  'placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors',
                  errors.front_text && 'border-red-500/50 focus:border-red-500'
                )}
              />
              {errors.front_text && (
                <p className="text-xs text-red-400 mt-1">{errors.front_text.message}</p>
              )}
            </div>

            {/* Back Text */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Back (Answer) <span className="text-purple-500">*</span>
              </Label>
              <Textarea
                {...register('back_text', { required: 'Back text is required' })}
                rows={4}
                className={cn(
                  'w-full min-h-[100px] resize-y px-4 py-3 rounded-xl',
                  'bg-[#0f0f16] border border-white/10 text-white',
                  'placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors',
                  errors.back_text && 'border-red-500/50 focus:border-red-500'
                )}
              />
              {errors.back_text && (
                <p className="text-xs text-red-400 mt-1">{errors.back_text.message}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => navigate(`/flashcards/${deckId}`)}
                className="flex-1 py-3 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !isDirty}
                className="flex-1 py-3 rounded-xl bg-cyan-600 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-500 transition-colors"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Update Card
                  </>
                )}
              </button>
            </div>
          </motion.form>
        </DarkCard>
      </div>
    </div>
  );
}
