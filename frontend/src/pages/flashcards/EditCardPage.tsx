import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCard, useUpdateCard } from '@/api/hooks/useFlashcards';
import { FlashcardEditorUpdate } from '@/modules/flashcards/components/FlashcardEditorUpdate';
import { useToast } from '@/hooks/use-toast';
import type { FlashcardUpdate } from '@/api/generated';

export function EditCardPage() {
    const navigate = useNavigate();
    const { deckId, cardId } = useParams<{ deckId: string; cardId: string }>();
    const { toast } = useToast();

    // Fetch card data
    const { data: card, isLoading, error } = useCard(Number(cardId));

    // Update mutation
    const updateMutation = useUpdateCard();

    const handleSubmit = async (data: FlashcardUpdate) => {
        if (!cardId) return;

        try {
            await updateMutation.mutateAsync({
                cardId: Number(cardId),
                                             data,
            });

            toast({
                title: 'Success!',
                description: 'Card updated successfully',
            });

            // Navigate back to deck
            navigate(`/flashcards/${deckId}`);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update card',
                variant: 'destructive',
            });
        }
    };

    const handleCancel = () => {
        navigate(`/flashcards/${deckId}`);
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
            <p className="text-sm text-gray-400 mb-4">
            {error?.message || 'Card not found'}
            </p>
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
        <div className="min-h-screen bg-[#020202] relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/10 via-transparent to-transparent" />
        <div className="absolute top-1/4 -right-48 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-48 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 p-6">
        <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
        >
        <Button
        variant="ghost"
        onClick={() => navigate(`/flashcards/${deckId}`)}
        className="mb-4 text-gray-400 hover:text-white"
        >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Deck
        </Button>

        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
        Edit Card
        </h1>
        <p className="text-gray-400 mt-2">
        Update the front and back of your flashcard
        </p>
        </motion.div>

        {/* Editor */}
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        >
        <FlashcardEditorUpdate
        mode="edit"
        initialData={{
            front_text: card.front_text,
            back_text: card.back_text,
            front_media_url: card.front_media_url,
            back_media_url: card.back_media_url,
        }}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={updateMutation.isPending}
        />
        </motion.div>
        </div>
        </div>
        </div>
    );
}
