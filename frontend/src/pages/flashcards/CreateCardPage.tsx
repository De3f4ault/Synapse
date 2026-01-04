/**
 * CreateCardPage - Card Creation
 * 
 * REFACTORED: Uses modular imports.
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

// Module imports
import { DarkCard } from './shared';
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
    <div className="min-h-screen nm-bg nm-constellation-bg flex flex-col items-center p-8 relative z-10">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <button
            onClick={() => navigate(`/flashcards/${id}`)}
            className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Create New Card
            </h1>
            <p className="text-slate-400 font-mono text-xs tracking-wider uppercase mt-1">
              ADD NEW FLASHCARD TO DECK
            </p>
          </div>
        </motion.div>

        {/* Editor Card */}
        <DarkCard padding="lg">
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Front Text */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Front (Question) <span className="text-cyan-500">*</span>
              </Label>
              <Textarea
                value={frontText}
                onChange={(e) => setFrontText(e.target.value)}
                placeholder="Enter the question or prompt..."
                rows={4}
                className={cn(
                  'w-full min-h-[100px] resize-y px-4 py-3 rounded-xl',
                  'bg-[#0f0f16] border border-white/10 text-white',
                  'placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors'
                )}
              />
            </div>

            {/* Back Text */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Back (Answer) <span className="text-purple-500">*</span>
              </Label>
              <Textarea
                value={backText}
                onChange={(e) => setBackText(e.target.value)}
                placeholder="Enter the answer..."
                rows={4}
                className={cn(
                  'w-full min-h-[100px] resize-y px-4 py-3 rounded-xl',
                  'bg-[#0f0f16] border border-white/10 text-white',
                  'placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors'
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => navigate(`/flashcards/${id}`)}
                className="flex-1 py-3 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !frontText.trim() || !backText.trim()}
                className="flex-1 py-3 rounded-xl bg-cyan-600 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-500 transition-colors"
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
          </motion.form>
        </DarkCard>
      </div>
    </div>
  );
}
