/**
 * DeckDetailPage - Neural Core Control Panel
 * REFACTORED: Now uses modular components
 */

import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Plus, Zap, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDeck, useDeckStats, useUpdateDeck } from './hooks/useDecks';
import { useDeleteCard } from './hooks/useCards';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {  getDueCardsApiV1CardsDueGet , FlashcardsService } from '@/api/generated';
import { DeckSettings } from './components/deck/DeckSettings';
import { DeckStats } from './components/deck/DeckStats';
import { CardList } from './components/card/CardList';

export function DeckDetailPage() {
    const { deckId } = useParams<{ deckId: string }>();
    const navigate = useNavigate();
    const id = parseInt(deckId || '0', 10);

    // Fetch deck and cards
    const { data: deck, isLoading: deckLoading } = useDeck(id);
    const { data: cards, isLoading: cardsLoading } = useQuery({
        queryKey: queryKeys.decks.cards(id),
                                                              queryFn: () => getDueCardsApiV1CardsDueGet({ deckId: id }),
                                                              enabled: !!id,
    });
    const stats = useDeckStats(id);

    // Mutations
    const { mutate: updateDeck } = useUpdateDeck();
    const { mutate: deleteCard } = useDeleteCard();

    if (deckLoading) {
        return (
            <div className="min-h-screen bg-[#020202] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" />
            <p className="text-slate-400 font-mono text-sm uppercase tracking-wider">
            Loading Memory Core...
            </p>
            </div>
            </div>
        );
    }

    if (!deck) {
        return (
            <div className="min-h-screen bg-[#020202] flex items-center justify-center text-white">
            <div className="text-center">
            <Brain className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-serif font-bold mb-2">Core Not Found</h2>
            <p className="text-slate-400 font-mono text-sm mb-6">Neural link severed</p>
            <Button
            onClick={() => navigate('/flashcards')}
            variant="outline"
            className="bg-white/5 border-white/5"
            >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Hub
            </Button>
            </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020202] text-slate-200 relative overflow-hidden">
        {/* Noise Texture */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />

        <div className="relative z-10 space-y-6 p-8">
        {/* Header */}
        <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
        >
        <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate('/flashcards')}
        className="text-slate-500 hover:text-white hover:bg-white/5"
        >
        <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Editable Deck Settings */}
        <DeckSettings
        deck={deck}
        onUpdate={(data) => updateDeck({ deckId: id, data })}
        />

        <Button
        onClick={() => navigate(`/flashcards/${id}/review`)}
        size="lg"
        className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold"
        >
        <Play className="mr-2 h-4 w-4" fill="currentColor" />
        INITIATE REVIEW
        </Button>
        </motion.div>

        {/* Stats Overview */}
        {stats && (
            <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            >
            <DeckStats stats={stats} />
            </motion.div>
        )}

        {/* Cards Table */}
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        >
        <Card className="bg-[rgba(10,10,10,0.6)] backdrop-blur-xl border-white/5">
        <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white font-serif text-xl">
        Memory Fragments ({deck.card_count || 0})
        </CardTitle>
        <Button
        onClick={() => navigate(`/flashcards/${id}/cards/new`)}
        className="bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold"
        >
        <Plus className="mr-2 h-4 w-4" />
        ADD FRAGMENT
        </Button>
        </CardHeader>
        <CardContent>
        {cardsLoading ? (
            <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto" />
            <p className="text-slate-400 font-mono text-sm mt-4">Loading fragments...</p>
            </div>
        ) : !cards || cards.length === 0 ? (
            <div className="text-center py-12">
            <Zap className="h-12 w-12 mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400 font-mono text-sm mb-4">No fragments detected</p>
            <Button
            variant="outline"
            className="bg-white/5 hover:bg-white/10 border-white/5 text-white"
            onClick={() => navigate(`/flashcards/${id}/cards/new`)}
            >
            Construct First Fragment
            </Button>
            </div>
        ) : (
            <CardList
            cards={cards}
            onEdit={(cardId) => navigate(`/flashcards/${id}/cards/${cardId}/edit`)}
            onDelete={(cardId) => deleteCard(cardId)}
            />
        )}
        </CardContent>
        </Card>
        </motion.div>
        </div>
        </div>
    );
}
