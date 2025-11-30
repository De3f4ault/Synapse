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
import {
    Plus,
    Search,
    MoreVertical,
    Edit,
    Trash2,
    Play,
    Layers,
    Sparkles,
    AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { DeckResponse } from '@/api/generated/types.gen';

/**
 * Mnemosyne Protocol Hub - Enhanced Flashcard Decks Interface
 * STANDARDIZED WITH DASHBOARD DESIGN (#020202)
 *
 * Features:
 * - Holographic deck pods with glassmorphic design
 * - Deep space aesthetic with neural theme
 * - Tech-inspired decorative elements
 * - Color-coded mastery visualization
 * - Hover state with centered play button
 * - Stagger animation on load
 * - Proper error state handling
 */

export function DecksPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch decks with proper error handling
    const { data: decksData, isLoading, error, isError } = useQuery({
        queryKey: queryKeys.decks.list(),
                                                                    queryFn: () => listDecksApiV1DecksGet(),
                                                                    retry: 1,
    });

    // Delete deck mutation
    const { mutate: deleteDeck } = useMutation({
        mutationFn: (id: number) => deleteDeckApiV1DecksDeckIdDelete({ deckId: id }),
                                               onSuccess: () => {
                                                   queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
                                                   toast.success('Memory core purged successfully');
                                               },
                                               onError: (error) => {
                                                   toast.error('Failed to delete deck', {
                                                       description: error instanceof Error ? error.message : 'Unknown error',
                                                   });
                                               },
    });

    // Ensure decksData is an array
    const decks = Array.isArray(decksData) ? decksData : [];

    // Filter decks by search query
    const filteredDecks = decks.filter((deck) =>
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

    // Color assignment based on deck index
    const getDeckColor = (index: number) => {
        const colors = ['cyan', 'purple', 'red', 'emerald', 'amber', 'blue'];
        return colors[index % colors.length];
    };

    return (
        <div className="min-h-screen bg-[#020202] text-slate-200 relative overflow-hidden">
        {/* Ambient Noise Texture */}
        <div className="absolute inset-0 z-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none" />

        <div className="relative z-10 space-y-6 p-8">
        {/* Header */}
        <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8"
        >
        <div>
        <h1 className="text-4xl font-serif font-bold text-white mb-2 tracking-wide">
        Mnemosyne Protocol
        </h1>
        <p className="text-slate-400 font-mono text-xs tracking-[0.2em] uppercase">
        SELECT A MEMORY CORE TO BEGIN IMPRINTING
        </p>
        </div>
        <Button
        onClick={() => navigate('/flashcards/create')}
        className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-sm font-bold text-white transition-all group"
        variant="ghost"
        >
        <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
        CONSTRUCT NEW CORE
        </Button>
        </motion.div>

        {/* Search Bar */}
        <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative max-w-md"
        >
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
        placeholder="Search memory cores..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-11 bg-black/40 border-white/5 text-white placeholder:text-slate-600 focus:border-cyan-500/50 transition-colors font-mono text-sm"
        />
        </motion.div>

        {/* Loading State */}
        {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 rounded-2xl bg-black/40 border border-white/5 animate-pulse" />
            ))}
            </div>
        )}

        {/* Error State */}
        {isError && (
            <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
            >
            <div className="relative mb-6">
            <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full" />
            <AlertTriangle className="h-16 w-16 text-red-500 relative z-10" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-white mb-2">
            Connection Error
            </h2>
            <p className="text-slate-400 font-mono text-sm mb-6 text-center max-w-md">
            {error instanceof Error
                ? error.message
                : 'Failed to load memory cores. Please check your authentication.'}
                </p>
                <div className="flex gap-3">
                <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.decks.all })}
                className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300"
                >
                Retry Connection
                </Button>
                <Button
                onClick={() => navigate('/auth/login')}
                className="bg-white/5 hover:bg-white/10 border border-white/5 text-white"
                variant="ghost"
                >
                Re-authenticate
                </Button>
                </div>
                </motion.div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && filteredDecks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
            <Sparkles className="h-16 w-16 text-purple-500/50 mb-6" />
            <h2 className="text-2xl font-serif font-bold text-white mb-2">
            {searchQuery ? 'No cores found' : 'Initialization Required'}
            </h2>
            <p className="text-slate-400 font-mono text-sm mb-6">
            {searchQuery
                ? 'Try adjusting your search query'
        : 'Construct your first memory core to begin neural imprinting'}
        </p>
        {!searchQuery && (
            <Button
            onClick={() => navigate('/flashcards/create')}
            className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300"
            >
            <Plus className="mr-2 h-4 w-4" />
            CONSTRUCT CORE
            </Button>
        )}
        </div>
        )}

        {/* Decks Grid */}
        {!isLoading && !isError && filteredDecks.length > 0 && (
            <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
            <AnimatePresence>
            {filteredDecks.map((deck, index) => (
                <DeckPod
                key={deck.id}
                deck={deck}
                color={getDeckColor(index)}
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
        </div>
    );
}

/**
 * Holographic Deck Pod Component
 */
interface DeckPodProps {
    deck: DeckResponse;
    color: string;
    variants: any;
    onDelete: () => void;
    onEdit: () => void;
    onReview: () => void;
    onClick: () => void;
}

function DeckPod({ deck, color, variants, onDelete, onEdit, onReview, onClick }: DeckPodProps) {
    const dueCount = 0; // TODO: Get from API
    const masteryPercent = Math.round((deck.card_count || 0) * 0.3); // Mock calculation

    // Color mapping for Tailwind classes
    const colorClasses = {
        cyan: {
            border: 'border-cyan-500/30',
            hoverBorder: 'hover:border-cyan-400',
            gradient: 'from-cyan-500/10',
            dot: 'bg-cyan-400',
            text: 'text-cyan-400',
            progress: 'bg-cyan-500',
            button: 'bg-cyan-500',
            shadow: 'shadow-cyan-500/50',
        },
        purple: {
            border: 'border-purple-500/30',
            hoverBorder: 'hover:border-purple-400',
            gradient: 'from-purple-500/10',
            dot: 'bg-purple-400',
            text: 'text-purple-400',
            progress: 'bg-purple-500',
            button: 'bg-purple-500',
            shadow: 'shadow-purple-500/50',
        },
        red: {
            border: 'border-red-500/30',
            hoverBorder: 'hover:border-red-400',
            gradient: 'from-red-500/10',
            dot: 'bg-red-400',
            text: 'text-red-400',
            progress: 'bg-red-500',
            button: 'bg-red-500',
            shadow: 'shadow-red-500/50',
        },
        emerald: {
            border: 'border-emerald-500/30',
            hoverBorder: 'hover:border-emerald-400',
            gradient: 'from-emerald-500/10',
            dot: 'bg-emerald-400',
            text: 'text-emerald-400',
            progress: 'bg-emerald-500',
            button: 'bg-emerald-500',
            shadow: 'shadow-emerald-500/50',
        },
        amber: {
            border: 'border-amber-500/30',
            hoverBorder: 'hover:border-amber-400',
            gradient: 'from-amber-500/10',
            dot: 'bg-amber-400',
            text: 'text-amber-400',
            progress: 'bg-amber-500',
            button: 'bg-amber-500',
            shadow: 'shadow-amber-500/50',
        },
        blue: {
            border: 'border-blue-500/30',
            hoverBorder: 'hover:border-blue-400',
            gradient: 'from-blue-500/10',
            dot: 'bg-blue-400',
            text: 'text-blue-400',
            progress: 'bg-blue-500',
            button: 'bg-blue-500',
            shadow: 'shadow-blue-500/50',
        },
    };

    const colors = colorClasses[color as keyof typeof colorClasses] || colorClasses.cyan;

    return (
        <motion.div variants={variants} layout>
        <motion.div
        whileHover={{ scale: 1.02, y: -5 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
        onClick={onClick}
        className={`relative group cursor-pointer h-48 rounded-2xl bg-[rgba(10,10,10,0.6)] backdrop-blur-xl border ${colors.border} overflow-hidden flex flex-col p-6 transition-all ${colors.hoverBorder} hover:shadow-[0_0_30px_rgba(0,0,0,0.5)]`}
        >
        {/* Gradient Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} via-transparent to-transparent opacity-50`} />

        {/* Tech Decor - Top Right */}
        <div className="absolute top-0 right-0 p-3 opacity-50 group-hover:opacity-100 transition-opacity">
        <div className="flex gap-1">
        <div className={`w-1 h-1 rounded-full ${colors.dot}`} />
        <div className={`w-1 h-1 rounded-full ${colors.dot} opacity-50`} />
        <div className={`w-1 h-1 rounded-full ${colors.dot} opacity-20`} />
        </div>
        </div>

        {/* Dropdown Menu - Top Left (visible on hover) */}
        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-7 w-7 bg-black/60 hover:bg-black/80 border border-white/5">
        <MoreVertical className="h-3 w-3 text-white" />
        </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-[rgba(10,10,10,0.95)] backdrop-blur-xl border-white/5">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReview(); }} className="text-white">
        <Play className="mr-2 h-4 w-4" />
        Review
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} className="text-white">
        <Edit className="mr-2 h-4 w-4" />
        Edit
        </DropdownMenuItem>
        <DropdownMenuItem
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="text-red-400 focus:text-red-300"
        >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
        </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-between">
        <div>
        <h3 className="text-xl font-bold text-white mb-1 font-serif tracking-wide line-clamp-2">
        {deck.name}
        </h3>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
        <Layers size={12} />
        {deck.card_count || 0} Fragments
        </div>
        </div>

        {/* Mastery Progress */}
        <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-slate-500">
        <span>Sync Status</span>
        <span className={colors.text}>{masteryPercent}%</span>
        </div>
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${masteryPercent}%` }}
        transition={{ duration: 1, delay: 0.2 }}
        className={`h-full ${colors.progress} shadow-[0_0_10px_currentColor]`}
        />
        </div>
        </div>
        </div>

        {/* Hover Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm">
        <button
        onClick={(e) => {
            e.stopPropagation();
            onReview();
        }}
        className={`p-4 rounded-full ${colors.button} text-white shadow-lg ${colors.shadow} scale-0 group-hover:scale-100 transition-transform duration-300`}
        >
        <Play size={24} fill="currentColor" />
        </button>
        </div>
        </motion.div>
        </motion.div>
    );
}
