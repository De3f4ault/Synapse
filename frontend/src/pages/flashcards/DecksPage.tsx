import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    listDecksApiV1DecksGet,
    deleteDeckApiV1DecksDeckIdDelete,
} from '@/api/generated/services.gen';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Plus,
    Search,
    MoreVertical,
    Edit,
    Trash2,
    Play,
    BookOpen,
    Clock,
    Target,
    TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import type { DeckResponse } from '@/api/generated/types.gen';

/**
 * Enhanced Decks Page
 *
 * Features:
 * - Responsive grid layout
 * - Real-time search filtering
 * - Hover effects with actions
 * - Color-coded progress indicators
 * - Stagger animation on load
 * - Empty state with illustration
 */

export function DecksPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch decks
    const { data: decks, isLoading } = useQuery({
        queryKey: queryKeys.decks.list(),
                                                queryFn: () => listDecksApiV1DecksGet(),
    });

    // Delete deck mutation
    const { mutate: deleteDeck } = useMutation({
        mutationFn: (id: number) => deleteDeckApiV1DecksDeckIdDelete({ deckId: id }),
                                               onSuccess: () => {
                                                   queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
                                                   toast.success('Deck deleted successfully');
                                               },
                                               onError: (error) => {
                                                   toast.error('Failed to delete deck', {
                                                       description: error instanceof Error ? error.message : 'Unknown error',
                                                   });
                                               },
    });

    // Filter decks by search query
    const filteredDecks = decks?.filter((deck) =>
    deck.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.4,
                ease: 'easeOut',
            },
        },
    };

    return (
        <div className="space-y-6">
        {/* Header */}
        <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
        <div>
        <h1 className="text-3xl font-bold tracking-tight">Flashcard Decks</h1>
        <p className="text-muted-foreground mt-1">
        Create and manage your flashcard collections
        </p>
        </div>
        <Button onClick={() => navigate('/flashcards/create')} size="lg">
        <Plus className="mr-2 h-4 w-4" />
        Create Deck
        </Button>
        </motion.div>

        {/* Search Bar */}
        <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative"
        >
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
        placeholder="Search decks..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-10"
        />
        </motion.div>

        {/* Loading State */}
        {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
                <Card key={i}>
                <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardContent>
                <Skeleton className="h-20 w-full" />
                </CardContent>
                </Card>
            ))}
            </div>
        )}

        {/* Empty State */}
        {!isLoading && (!filteredDecks || filteredDecks.length === 0) && (
            <EmptyState
            icon={<BookOpen className="h-16 w-16" />}
            title={searchQuery ? 'No decks found' : 'No decks yet'}
            description={
                searchQuery
                ? 'Try adjusting your search query'
                : 'Create your first deck to start learning'
            }
            action={
                searchQuery
                ? undefined
                : {
                    label: 'Create Deck',
                    onClick: () => navigate('/flashcards/create'),
                }
            }
            variant="no-data"
            />
        )}

        {/* Decks Grid */}
        {!isLoading && filteredDecks && filteredDecks.length > 0 && (
            <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
            <AnimatePresence>
            {filteredDecks.map((deck) => (
                <DeckCard
                key={deck.id}
                deck={deck}
                variants={cardVariants}
                onDelete={() => deleteDeck(deck.id)}
                onEdit={() => navigate(`/flashcards/${deck.id}/edit`)}
                onReview={() => navigate(`/flashcards/${deck.id}/review`)}
                onClick={() => navigate(`/flashcards/${deck.id}`)}
                />
            ))}
            </AnimatePresence>
            </motion.div>
        )}
        </div>
    );
}

/**
 * Deck Card Component
 */
interface DeckCardProps {
    deck: DeckResponse;
    variants: any;
    onDelete: () => void;
    onEdit: () => void;
    onReview: () => void;
    onClick: () => void;
}

function DeckCard({ deck, variants, onDelete, onEdit, onReview, onClick }: DeckCardProps) {
    const dueCount = 0; // Mock - replace with actual due count from API
    const masteryPercent = 30; // Mock - calculate from deck stats

    return (
        <motion.div variants={variants} layout>
        <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        transition={{ duration: 0.2 }}
        >
        <Card className="cursor-pointer hover:shadow-xl transition-shadow border-2 hover:border-primary/50 relative overflow-hidden">
        {/* Gradient Background Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

        <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
        <div className="flex-1" onClick={onClick}>
        <h3 className="font-semibold text-lg line-clamp-1 mb-1">
        {deck.name}
        </h3>
        {deck.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
            {deck.description}
            </p>
        )}
        </div>

        <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-8 w-8">
        <MoreVertical className="h-4 w-4" />
        </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onReview}>
        <Play className="mr-2 h-4 w-4" />
        Review
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
        <Edit className="mr-2 h-4 w-4" />
        Edit
        </DropdownMenuItem>
        <DropdownMenuItem
        onClick={onDelete}
        className="text-destructive focus:text-destructive"
        >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
        </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
        </div>
        </CardHeader>

        <CardContent className="pb-3" onClick={onClick}>
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
        <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <div>
        <p className="text-xs text-muted-foreground">Total</p>
        <p className="text-sm font-bold">{deck.card_count}</p>
        </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30">
        <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        <div>
        <p className="text-xs text-muted-foreground">Due</p>
        <p className="text-sm font-bold">{dueCount}</p>
        </div>
        </div>
        </div>

        {/* Mastery Progress */}
        <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium flex items-center gap-1">
        <Target className="h-3 w-3" />
        Mastery
        </span>
        <span className="text-xs font-bold text-green-600 dark:text-green-500">
        {masteryPercent}%
        </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${masteryPercent}%` }}
        transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
        className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
        />
        </div>
        </div>
        </CardContent>

        <CardFooter className="pt-0 pb-3">
        {dueCount > 0 ? (
            <Button
            size="sm"
            className="w-full"
            onClick={(e) => {
                e.stopPropagation();
                onReview();
            }}
            >
            <Play className="mr-2 h-3 w-3" />
            Review {dueCount} Cards
            </Button>
        ) : (
            <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            >
            <TrendingUp className="mr-2 h-3 w-3" />
            View Details
            </Button>
        )}
        </CardFooter>
        </Card>
        </motion.div>
        </motion.div>
    );
}
