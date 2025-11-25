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
import { Progress } from '@/components/ui/progress';
import {
    ArrowLeft,
    Play,
    Plus,
    Edit2,
    Check,
    X,
    Trash2,
    Target,
    BookOpen,
    Clock,
    TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Enhanced Deck Detail Page
 *
 * Features:
 * - Inline editing for name and description
 * - Circular progress visualization
 * - Card list with state badges
 * - Quick stats overview
 * - Add card button
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
            toast.success('Deck updated successfully');
            setIsEditingName(false);
            setIsEditingDescription(false);
        },
        onError: (error) => {
            toast.error('Failed to update deck', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
    });

    // Delete card mutation
    const { mutate: deleteCard } = useMutation({
        mutationFn: (cardId: number) => deleteCardApiV1CardsCardIdDelete({ cardId }),
                                               onSuccess: () => {
                                                   queryClient.invalidateQueries({ queryKey: queryKeys.decks.cards(id) });
                                                   toast.success('Card deleted successfully');
                                               },
                                               onError: (error) => {
                                                   toast.error('Failed to delete card', {
                                                       description: error instanceof Error ? error.message : 'Unknown error',
                                                   });
                                               },
    });

    // Calculate stats
    const totalCards = deck?.card_count || 0;
    const dueCards = 0; // Mock
    const masteredCards = Math.round(totalCards * 0.3); // Mock
    const learningCards = Math.round(totalCards * 0.5); // Mock
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
                return 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300';
            case 'learning':
                return 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300';
            case 'review':
                return 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300';
            case 'mastered':
                return 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300';
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-300';
        }
    };

    if (deckLoading) {
        return (
            <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
        );
    }

    if (!deck) {
        return <div>Deck not found</div>;
    }

    return (
        <div className="space-y-6">
        {/* Header */}
        <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
        >
        <Button variant="ghost" size="icon" onClick={() => navigate('/flashcards')}>
        <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
        {isEditingName ? (
            <div className="flex items-center gap-2">
            <Input
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            className="text-2xl font-bold h-auto py-1"
            autoFocus
            onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave('name');
                if (e.key === 'Escape') handleCancel('name');
            }}
            />
            <Button size="icon" variant="ghost" onClick={() => handleSave('name')}>
            <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => handleCancel('name')}>
            <X className="h-4 w-4 text-red-600" />
            </Button>
            </div>
        ) : (
            <h1
            className="text-3xl font-bold tracking-tight cursor-pointer hover:text-primary transition-colors flex items-center gap-2 group"
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
            className="resize-none"
            rows={2}
            autoFocus
            onKeyDown={(e) => {
                if (e.key === 'Escape') handleCancel('description');
            }}
            />
            <div className="flex flex-col gap-1">
            <Button size="icon" variant="ghost" onClick={() => handleSave('description')}>
            <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => handleCancel('description')}>
            <X className="h-4 w-4 text-red-600" />
            </Button>
            </div>
            </div>
        ) : (
            <p
            className="text-muted-foreground mt-1 cursor-pointer hover:text-foreground transition-colors group"
            onClick={() => handleStartEdit('description')}
            >
            {deck.description || 'Add a description...'}
            <Edit2 className="h-4 w-4 inline ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
        )}
        </div>
        <Button onClick={() => navigate(`/flashcards/${id}/review`)} size="lg">
        <Play className="mr-2 h-4 w-4" />
        Review
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
        <Card>
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
        className="text-muted"
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
        className="text-green-500"
        />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{masteryPercent}%</span>
        <span className="text-xs text-muted-foreground">Mastered</span>
        </div>
        </div>
        <Target className="h-5 w-5 text-green-500 mt-2" />
        </CardContent>
        </Card>
        </motion.div>

        {/* Quick Stats */}
        {[
            { label: 'Total Cards', value: totalCards, icon: BookOpen, color: 'text-blue-500' },
            { label: 'Due', value: dueCards, icon: Clock, color: 'text-orange-500' },
            { label: 'Learning', value: learningCards, icon: TrendingUp, color: 'text-amber-500' },
            { label: 'Mastered', value: masteredCards, icon: Target, color: 'text-green-500' },
        ].map((stat, index) => (
            <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            >
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            <stat.icon className={cn('h-4 w-4', stat.color)} />
            </CardHeader>
            <CardContent>
            <p className="text-3xl font-bold">{stat.value}</p>
            </CardContent>
            </Card>
            </motion.div>
        ))}
        </div>

        {/* Cards Table */}
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        >
        <Card>
        <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Cards ({totalCards})</CardTitle>
        <Button onClick={() => navigate(`/flashcards/${id}/cards/new`)}>
        <Plus className="mr-2 h-4 w-4" />
        Add Card
        </Button>
        </CardHeader>
        <CardContent>
        {cardsLoading ? (
            <div className="text-center py-8">Loading cards...</div>
        ) : !cards || cards.length === 0 ? (
            <div className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No cards yet</p>
            <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate(`/flashcards/${id}/cards/new`)}
            >
            Add Your First Card
            </Button>
            </div>
        ) : (
            <Table>
            <TableHeader>
            <TableRow>
            <TableHead>Front</TableHead>
            <TableHead>Back</TableHead>
            <TableHead>State</TableHead>
            <TableHead>Accuracy</TableHead>
            <TableHead className="text-right">Actions</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {cards.map((card) => (
                <TableRow key={card.id}>
                <TableCell className="max-w-xs truncate">{card.front_text}</TableCell>
                <TableCell className="max-w-xs truncate">{card.back_text}</TableCell>
                <TableCell>
                <Badge
                variant="outline"
                className={getLearningStateColor(card.learning_state)}
                >
                {card.learning_state}
                </Badge>
                </TableCell>
                <TableCell>
                <div className="flex items-center gap-2">
                <Progress value={card.accuracy * 100} className="w-16 h-2" />
                <span className="text-sm">{(card.accuracy * 100).toFixed(0)}%</span>
                </div>
                </TableCell>
                <TableCell className="text-right">
                <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteCard(card.id)}
                >
                <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
            </Table>
        )}
        </CardContent>
        </Card>
        </motion.div>
        </div>
    );
}
