import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SkeletonCardGrid } from '@/components/common/SkeletonCard';
import { EmptyState } from '@/components/common/EmptyState';
import { motion } from 'framer-motion';
import {
    BookOpen,
    Clock,
    TrendingUp,
    Search,
    MoreVertical,
    Edit,
    Trash2,
    Share2,
    Play,
    Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DeckResponse } from '@/api/generated';

/**
 * Enhanced Deck List Component
 *
 * Displays user's flashcard decks with:
 * - Responsive grid layout
 * - Search functionality
 * - Hover effects with actions
 * - Color-coded AI badge
 * - Quick review action
 * - Empty state
 * - Skeleton loading
 */

interface DeckListProps {
    decks: DeckResponse[];
    isLoading?: boolean;
    onEdit?: (deck: DeckResponse) => void;
    onDelete?: (deck: DeckResponse) => void;
    onShare?: (deck: DeckResponse) => void;
}

export function DeckList({
    decks,
    isLoading,
    onEdit,
    onDelete,
    onShare,
}: DeckListProps) {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [hoveredDeck, setHoveredDeck] = useState<number | null>(null);

    // Filter decks by search query
    const filteredDecks = decks.filter((deck) => {
        const searchLower = searchQuery.toLowerCase();
        return (
            deck.name.toLowerCase().includes(searchLower) ||
            deck.description?.toLowerCase().includes(searchLower) ||
            deck.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
        );
    });

    // Loading state
    if (isLoading) {
        return <SkeletonCardGrid count={6} variant="default" />;
    }

    // Empty state - no decks at all
    if (decks.length === 0) {
        return (
            <EmptyState
            icon={<BookOpen className="h-12 w-12" />}
            title="No decks yet"
            description="Create your first deck to start organizing your flashcards"
            action={{
                label: 'Create Your First Deck',
                onClick: () => navigate('/flashcards/new'),
            }}
            secondaryAction={{
                label: 'Learn More',
                onClick: () => window.open('https://docs.example.com/decks', '_blank'),
            }}
            variant="no-data"
            />
        );
    }

    return (
        <div className="space-y-4">
        {/* Search Bar */}
        <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
        type="search"
        placeholder="Search decks by name, description, or tags..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-9"
        />
        </div>
        <div className="text-sm text-muted-foreground">
        {filteredDecks.length} {filteredDecks.length === 1 ? 'deck' : 'decks'}
        </div>
        </div>

        {/* No search results */}
        {filteredDecks.length === 0 && searchQuery && (
            <EmptyState
            icon={<Search className="h-12 w-12" />}
            title="No decks found"
            description={`No decks match "${searchQuery}". Try a different search term.`}
            action={{
                label: 'Clear Search',
                onClick: () => setSearchQuery(''),
            }}
            variant="no-results"
            />
        )}

        {/* Deck Grid */}
        {filteredDecks.length > 0 && (
            <motion.div
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={{
                visible: {
                    transition: {
                        staggerChildren: 0.05,
                    },
                },
            }}
            >
            {filteredDecks.map((deck) => (
                <DeckCard
                key={deck.id}
                deck={deck}
                isHovered={hoveredDeck === deck.id}
                onHover={() => setHoveredDeck(deck.id)}
                onHoverEnd={() => setHoveredDeck(null)}
                onClick={() => navigate(`/flashcards/${deck.id}`)}
                onReview={() => navigate(`/flashcards/${deck.id}/review`)}
                onEdit={onEdit}
                onDelete={onDelete}
                onShare={onShare}
                />
            ))}
            </motion.div>
        )}
        </div>
    );
}

/**
 * Individual Deck Card Component
 */
interface DeckCardProps {
    deck: DeckResponse;
    isHovered: boolean;
    onHover: () => void;
    onHoverEnd: () => void;
    onClick: () => void;
    onReview: () => void;
    onEdit?: (deck: DeckResponse) => void;
    onDelete?: (deck: DeckResponse) => void;
    onShare?: (deck: DeckResponse) => void;
}

function DeckCard({
    deck,
    isHovered,
    onHover,
    onHoverEnd,
    onClick,
    onReview,
    onEdit,
    onDelete,
    onShare,
}: DeckCardProps) {
    return (
        <motion.div
        variants={{
            hidden: { opacity: 0, y: 20 },
            visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.3 },
            },
        }}
        whileHover={{ scale: 1.02, y: -4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        onHoverStart={onHover}
        onHoverEnd={onHoverEnd}
        >
        <Card
        className={cn(
            'cursor-pointer transition-all duration-300 h-full',
            'hover:shadow-lg hover:border-primary/50',
            isHovered && 'ring-2 ring-primary/20'
        )}
        onClick={onClick}
        >
        <CardHeader>
        <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
        <CardTitle className="line-clamp-1 text-lg">
        {deck.name}
        </CardTitle>
        <CardDescription className="line-clamp-2 mt-1.5">
        {deck.description || 'No description'}
        </CardDescription>
        </div>

        {/* Badges and Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
        {deck.ai_generated && (
            <Badge
            variant="secondary"
            className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
            >
            <Sparkles className="h-3 w-3 mr-1" />
            AI
            </Badge>
        )}

        {/* Actions Menu */}
        <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button
        variant="ghost"
        size="icon"
        className={cn(
            'h-8 w-8 opacity-0 transition-opacity',
            isHovered && 'opacity-100'
        )}
        >
        <MoreVertical className="h-4 w-4" />
        <span className="sr-only">Actions</span>
        </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={(e) => {
            e.stopPropagation();
            onReview();
        }}>
        <Play className="h-4 w-4 mr-2" />
        Start Review
        </DropdownMenuItem>
        {onEdit && (
            <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onEdit(deck);
            }}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Deck
            </DropdownMenuItem>
        )}
        {onShare && (
            <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onShare(deck);
            }}>
            <Share2 className="h-4 w-4 mr-2" />
            Share Deck
            </DropdownMenuItem>
        )}
        {onDelete && (
            <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
            onClick={(e) => {
                e.stopPropagation();
                onDelete(deck);
            }}
            className="text-destructive focus:text-destructive"
            >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Deck
            </DropdownMenuItem>
            </>
        )}
        </DropdownMenuContent>
        </DropdownMenu>
        </div>
        </div>
        </CardHeader>

        <CardContent>
        {/* Tags */}
        {deck.tags && deck.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
            {deck.tags.slice(0, 3).map((tag, i) => (
                <Badge
                key={i}
                variant="outline"
                className="text-xs font-normal"
                >
                {tag}
                </Badge>
            ))}
            {deck.tags.length > 3 && (
                <Badge variant="outline" className="text-xs font-normal">
                +{deck.tags.length - 3}
                </Badge>
            )}
            </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-primary/10">
        <BookOpen className="h-3.5 w-3.5 text-primary" />
        </div>
        <div>
        <p className="font-semibold">{deck.card_count}</p>
        <p className="text-xs text-muted-foreground">Cards</p>
        </div>
        </div>

        <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-muted">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div>
        <p className="text-xs text-muted-foreground line-clamp-1">
        {formatDistanceToNow(new Date(deck.updated_at), {
            addSuffix: true,
        })}
        </p>
        </div>
        </div>
        </div>

        {/* Public Badge */}
        {deck.is_public && (
            <div className="mt-4 pt-4 border-t">
            <Badge
            variant="outline"
            className="text-xs font-normal bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
            >
            <TrendingUp className="h-3 w-3 mr-1" />
            Public Deck
            </Badge>
            </div>
        )}

        {/* Quick Review Button (shown on hover) */}
        <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{
            opacity: isHovered ? 1 : 0,
            height: isHovered ? 'auto' : 0,
        }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
        >
        <Button
        variant="outline"
        size="sm"
        className="w-full mt-4"
        onClick={(e) => {
            e.stopPropagation();
            onReview();
        }}
        >
        <Play className="h-3 w-3 mr-2" />
        Start Review
        </Button>
        </motion.div>
        </CardContent>
        </Card>
        </motion.div>
    );
}
