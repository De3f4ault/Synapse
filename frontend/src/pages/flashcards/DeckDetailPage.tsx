import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    getDeckApiV1DecksDeckIdGet,
    getDueCardsApiV1CardsDueGet,
    updateDeckApiV1DecksDeckIdPut,
    deleteCardApiV1CardsCardIdDelete,
} from '@/api/generated/services.gen';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    ArrowLeft,
    Play,
    Plus,
    Edit2,
    Check,
    X,
    Trash2,
    Target,
    Layers,
    Clock,
    Brain,
    Zap,
    Sparkles,
    Edit,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Neural Core Control Panel - Enhanced Deck Detail
 * STANDARDIZED WITH DASHBOARD (#020202)
 */

export function DeckDetailPage() {
    const { deckId } = useParams<{ deckId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedName, setEditedName] = useState('');
    const [editedDescription, setEditedDescription] = useState('');

    const id = parseInt(deckId || '0', 10);

    // Fetch deck
    const { data: deck, isLoading: deckLoading } = useQuery({
        queryKey: queryKeys.decks.detail(id),
                                                            queryFn: () => getDeckApiV1DecksDeckIdGet({ deckId: id }),
                                                            enabled: !!id,
    });

    // Fetch cards
    const { data: cards, isLoading: cardsLoading } = useQuery({
        queryKey: queryKeys.decks.cards(id),
                                                              queryFn: () => getDueCardsApiV1CardsDueGet({ deckId: id }),
                                                              enabled: !!id,
    });

    // Update deck mutation
    const { mutate: updateDeck } = useMutation({
        mutationFn: (data: { name?: string; description?: string }) =>
        updateDeckApiV1DecksDeckIdPut({
            deckId: id,
            requestBody: data,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.decks.detail(id) });
            toast.success('Memory core updated');
            setIsEditingName(false);
            setIsEditingDescription(false);
        },
        onError: (error) => {
            toast.error('Failed to update core', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
    });

    // Delete card mutation
    const { mutate: deleteCard } = useMutation({
        mutationFn: (cardId: number) => deleteCardApiV1CardsCardIdDelete({ cardId }),
                                               onSuccess: () => {
                                                   queryClient.invalidateQueries({ queryKey: queryKeys.decks.cards(id) });
                                                   toast.success('Fragment deleted');
                                               },
                                               onError: (error) => {
                                                   toast.error('Failed to delete fragment', {
                                                       description: error instanceof Error ? error.message : 'Unknown error',
                                                   });
                                               },
    });

    // Calculate stats
    const totalCards = deck?.card_count || 0;
    const dueCards = 0; // TODO: Get from API
    const masteredCards = Math.round(totalCards * 0.3);
    const learningCards = Math.round(totalCards * 0.5);
    const newCards = totalCards - masteredCards - learningCards;
    const masteryPercent = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

    const handleStartEdit = (field: 'name' | 'description') => {
        if (field === 'name') {
            setEditedName(deck?.name || '');
            setIsEditingName(true);
        } else {
            setEditedDescription(deck?.description || '');
            setIsEditingDescription(true);
        }
    };

    const handleSave = (field: 'name' | 'description') => {
        if (field === 'name' && editedName.trim()) {
            updateDeck({ name: editedName });
        } else if (field === 'description') {
            updateDeck({ description: editedDescription });
        }
    };

    const handleCancel = (field: 'name' | 'description') => {
        if (field === 'name') {
            setIsEditingName(false);
            setEditedName('');
        } else {
            setIsEditingDescription(false);
            setEditedDescription('');
        }
    };

    const getLearningStateColor = (state: string) => {
        switch (state) {
            case 'new':
                return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
            case 'learning':
                return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
            case 'review':
                return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
            case 'mastered':
                return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
            default:
                return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
        }
    };

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
            <Button onClick={() => navigate('/flashcards')} variant="outline" className="bg-white/5 border-white/5">
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

        <div className="flex-1">
        {isEditingName ? (
            <div className="flex items-center gap-2">
            <Input
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            className="text-2xl font-serif font-bold h-auto py-2 bg-black/40 border-cyan-500/30 text-white focus:border-cyan-500"
            autoFocus
            onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave('name');
                if (e.key === 'Escape') handleCancel('name');
            }}
            />
            <Button
            size="icon"
            variant="ghost"
            onClick={() => handleSave('name')}
            className="hover:bg-emerald-500/20 text-emerald-400"
            >
            <Check className="h-4 w-4" />
            </Button>
            <Button
            size="icon"
            variant="ghost"
            onClick={() => handleCancel('name')}
            className="hover:bg-red-500/20 text-red-400"
            >
            <X className="h-4 w-4" />
            </Button>
            </div>
        ) : (
            <h1
            className="text-3xl font-serif font-bold tracking-wide cursor-pointer hover:text-cyan-400 transition-colors flex items-center gap-2 group"
            onClick={() => handleStartEdit('name')}
            >
            {deck.name}
            <Edit2 className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h1>
        )}

        {isEditingDescription ? (
            <div className="flex items-start gap-2 mt-2">
            <Textarea
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            className="resize-none bg-black/40 border-purple-500/30 text-slate-300 focus:border-purple-500"
            rows={2}
            autoFocus
            onKeyDown={(e) => {
                if (e.key === 'Escape') handleCancel('description');
            }}
            />
            <div className="flex flex-col gap-1">
            <Button
            size="icon"
            variant="ghost"
            onClick={() => handleSave('description')}
            className="hover:bg-emerald-500/20 text-emerald-400"
            >
            <Check className="h-4 w-4" />
            </Button>
            <Button
            size="icon"
            variant="ghost"
            onClick={() => handleCancel('description')}
            className="hover:bg-red-500/20 text-red-400"
            >
            <X className="h-4 w-4" />
            </Button>
            </div>
            </div>
        ) : (
            <p
            className="text-slate-400 font-mono text-sm mt-1 cursor-pointer hover:text-slate-300 transition-colors group"
            onClick={() => handleStartEdit('description')}
            >
            {deck.description || 'Add neural signature...'}
            <Edit2 className="h-3 w-3 inline ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
        )}
        </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Circular Progress */}
        <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        >
        <Card className="bg-[rgba(10,10,10,0.6)] backdrop-blur-xl border-white/5">
        <CardContent className="flex flex-col items-center justify-center py-6">
        <div className="relative w-32 h-32">
        <svg className="transform -rotate-90 w-32 h-32">
        <circle
        cx="64"
        cy="64"
        r="56"
        stroke="currentColor"
        strokeWidth="8"
        fill="none"
        className="text-slate-800"
        />
        <motion.circle
        cx="64"
        cy="64"
        r="56"
        stroke="currentColor"
        strokeWidth="8"
        fill="none"
        strokeDasharray={`${2 * Math.PI * 56}`}
        initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
        animate={{
            strokeDashoffset: 2 * Math.PI * 56 * (1 - masteryPercent / 100),
        }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
        />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{masteryPercent}%</span>
        <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
        Synced
        </span>
        </div>
        </div>
        <Target className="h-5 w-5 text-emerald-500 mt-2" />
        </CardContent>
        </Card>
        </motion.div>

        {/* Quick Stats */}
        {[
            { label: 'Total Fragments', value: totalCards, icon: Layers, color: 'cyan' },
            { label: 'Due Now', value: dueCards, icon: Clock, color: 'amber' },
            { label: 'In Progress', value: learningCards, icon: Brain, color: 'purple' },
            { label: 'Mastered', value: masteredCards, icon: Sparkles, color: 'emerald' },
        ].map((stat, index) => {
            const colorClasses = {
                cyan: 'text-cyan-500 from-cyan-500/10',
                amber: 'text-amber-500 from-amber-500/10',
                purple: 'text-purple-500 from-purple-500/10',
                emerald: 'text-emerald-500 from-emerald-500/10',
            };
            const colors = colorClasses[stat.color as keyof typeof colorClasses];

            return (
                <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                >
                <Card className="bg-[rgba(10,10,10,0.6)] backdrop-blur-xl border-white/5 relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${colors.split(' ')[1]} via-transparent to-transparent opacity-50`} />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                {stat.label}
                </p>
                <stat.icon className={cn('h-4 w-4', colors.split(' ')[0])} />
                </CardHeader>
                <CardContent className="relative z-10">
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                </CardContent>
                </Card>
                </motion.div>
            );
        })}
        </div>

        {/* Cards Table */}
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        >
        <Card className="bg-[rgba(10,10,10,0.6)] backdrop-blur-xl border-white/5">
        <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white font-serif text-xl">
        Memory Fragments ({totalCards})
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
            <div className="border border-white/5 rounded-lg overflow-hidden">
            <Table>
            <TableHeader>
            <TableRow className="border-white/5 hover:bg-white/5">
            <TableHead className="text-slate-400 font-mono text-xs uppercase">
            Query
            </TableHead>
            <TableHead className="text-slate-400 font-mono text-xs uppercase">
            Response
            </TableHead>
            <TableHead className="text-slate-400 font-mono text-xs uppercase">
            State
            </TableHead>
            <TableHead className="text-slate-400 font-mono text-xs uppercase">
            Accuracy
            </TableHead>
            <TableHead className="text-right text-slate-400 font-mono text-xs uppercase">
            Actions
            </TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {cards.map((card) => (
                <TableRow key={card.id} className="border-white/5 hover:bg-white/5">
                <TableCell className="max-w-xs truncate text-slate-300">
                {card.front_text}
                </TableCell>
                <TableCell className="max-w-xs truncate text-slate-300">
                {card.back_text}
                </TableCell>
                <TableCell>
                <Badge
                variant="outline"
                className={cn(
                    'font-mono text-[10px] uppercase tracking-wider',
                    getLearningStateColor(card.learning_state)
                )}
                >
                {card.learning_state}
                </Badge>
                </TableCell>
                <TableCell>
                <div className="flex items-center gap-2">
                <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                style={{ width: `${card.accuracy * 100}%` }}
                />
                </div>
                <span className="text-xs font-mono text-slate-400">
                {(card.accuracy * 100).toFixed(0)}%
                </span>
                </div>
                </TableCell>
                <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/flashcards/${id}/cards/${card.id}/edit`)}
                className="hover:bg-cyan-500/20 text-cyan-400"
                >
                <Edit className="h-4 w-4" />
                </Button>
                <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteCard(card.id)}
                className="hover:bg-red-500/20 text-red-400"
                >
                <Trash2 className="h-4 w-4" />
                </Button>
                </div>
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
            </Table>
            </div>
        )}
        </CardContent>
        </Card>
        </motion.div>
        </div>
        </div>
    );
}
