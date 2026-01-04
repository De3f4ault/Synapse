/**
 * DeckDetailPage - Deck Overview & Card Management
 * 
 * REFACTORED: Uses modular imports with solid dark styling.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  Plus,
  Brain,
  Layers,
  Sparkles,
  TrendingUp,
  Target,
  Activity,
  Wand2,
  BookOpen,
  BarChart3,
  ChevronRight,
  Star,
  Flame,
  Edit,
  Trash2,
  Loader2,
  Upload, // Added Upload Icon
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query'; // Added useQueryClient
import { queryKeys } from '@/lib/queryKeys';
import { FlashcardsService } from '@/api/generated';
import { cn } from '@/lib/utils';
import { useState } from 'react'; // Added useState

// Module imports
import { useDeck } from './list';
import { useActiveDeck, type Flashcard, type LearningState } from './core';
import { DarkCard, EmptyState } from './shared';
// Import Modal
import { ImportModal } from './components/ImportModal';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
};

// Stat Card Component
function StatCard({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  color: 'cyan' | 'purple' | 'red' | 'emerald' | 'amber';
}) {
  const colorClasses = {
    cyan: 'text-cyan-400 border-cyan-500/20',
    purple: 'text-purple-400 border-purple-500/20',
    red: 'text-red-400 border-red-500/20',
    emerald: 'text-emerald-400 border-emerald-500/20',
    amber: 'text-amber-400 border-amber-500/20',
  };

  return (
    <DarkCard className={`p-5 text-center border ${colorClasses[color]}`}>
      <div className={`w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3 mx-auto ${colorClasses[color].split(' ')[0]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
        {label}
      </div>
    </DarkCard>
  );
}

// Mastery Progress Component
function MasteryProgress({ percentage }: { percentage: number }) {
  return (
    <DarkCard className="p-8 flex flex-col items-center">
      <div className="relative w-40 h-40 flex items-center justify-center mb-4">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={264}
            initial={{ strokeDashoffset: 264 }}
            animate={{ strokeDashoffset: 264 - (percentage / 100) * 264 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black text-white">{percentage}%</span>
          <div className="flex items-center gap-1 mt-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
              Mastered
            </span>
          </div>
        </div>
      </div>
    </DarkCard>
  );
}

// Card Item Component
function CardItem({
  card,
  index,
  onEdit,
  onDelete,
}: {
  card: Flashcard;
  index: number;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const stateColors: Record<LearningState, string> = {
    new: 'text-purple-400 border-purple-500/30',
    learning: 'text-amber-400 border-amber-500/30',
    review: 'text-cyan-400 border-cyan-500/30',
    mastered: 'text-emerald-400 border-emerald-500/30',
  };
  const colorClass = stateColors[card.learning_state] || stateColors.new;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <DarkCard hoverable className="p-4 group">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${colorClass}`}>
                {card.learning_state}
              </span>
              {card.accuracy && card.accuracy > 0.8 && (
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              )}
            </div>
            <h4 className="text-sm font-medium text-white truncate mb-1">
              {card.front_text}
            </h4>
            <p className="text-xs text-slate-500 truncate">{card.back_text}</p>
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Accuracy bar */}
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(card.accuracy || 0) * 100}%` }}
                  transition={{ delay: index * 0.03 + 0.2 }}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {((card.accuracy || 0) * 100).toFixed(0)}%
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(card.id)}
                className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(card.id)}
                className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </DarkCard>
    </motion.div>
  );
}

// Quick Action Button
function QuickAction({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary';
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center px-4 py-3 rounded-xl transition-colors',
        variant === 'primary'
          ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
          : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mr-3">
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-sm font-medium flex-1 text-left">{label}</span>
      <ChevronRight className="w-4 h-4 text-slate-600" />
    </button>
  );
}

// Main Component
export function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const id = parseInt(deckId || '0', 10);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Sync with core store
  useActiveDeck({ deckId: id });

  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.decks.detail(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.decks.cards(id) });
  };

  // Fetch deck and cards
  const { data: deck, isLoading: deckLoading } = useDeck(id);
  const { data: cardsResponse, isLoading: cardsLoading } = useQuery({
    queryKey: queryKeys.decks.cards(id),
    queryFn: () => FlashcardsService.listDeckCardsApiV1DecksDeckIdCardsGet(id),
    enabled: !!id,
  });
  const cards = cardsResponse as Flashcard[] | undefined;

  // Calculate stats from cards
  const stats = cards ? {
    totalCards: cards.length,
    dueCards: cards.filter(c => c.next_review && new Date(c.next_review) <= new Date()).length,
    learningCards: cards.filter(c => c.learning_state === 'learning').length,
    masteredCards: cards.filter(c => c.learning_state === 'mastered').length,
    masteryPercent: cards.length > 0
      ? Math.round((cards.filter(c => c.learning_state === 'mastered').length / cards.length) * 100)
      : 0,
  } : null;

  // Loading state
  if (deckLoading) {
    return (
      <div className="min-h-screen nm-bg nm-constellation-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
          </div>
          <p className="text-slate-400 font-mono text-sm uppercase tracking-widest">
            Loading Deck...
          </p>
        </div>
      </div>
    );
  }

  // Not found state
  if (!deck) {
    return (
      <div className="min-h-screen nm-bg nm-constellation-bg flex items-center justify-center">
        <EmptyState
          icon={<Brain className="h-12 w-12" />}
          title="Deck Not Found"
          description="The requested deck could not be located."
          action={{
            label: "Return to Flashcards",
            onClick: () => navigate("/flashcards"),
          }}
          variant="error"
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen nm-bg nm-constellation-bg overflow-hidden flex flex-col">
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <motion.div
        className="flex-1 overflow-y-auto scrollbar-hide p-8 pb-32 space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Navigation */}
        <motion.div variants={itemVariants} className="flex items-center gap-4">
          <button
            onClick={() => navigate('/flashcards')}
            className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="text-sm text-slate-500 font-mono">
            <span
              className="hover:text-cyan-400 cursor-pointer"
              onClick={() => navigate('/flashcards')}
            >
              Flashcards
            </span>
            <span className="mx-2">/</span>
            <span className="text-white">{deck.name}</span>
          </div>
        </motion.div>

        {/* Hero Section */}
        <motion.div variants={itemVariants}>
          <DarkCard padding="lg">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">{deck.name}</h1>
              <p className="text-slate-400">{deck.description || 'No description'}</p>
            </div>

            {/* Central Mastery & Stats */}
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="flex-shrink-0">
                <MasteryProgress percentage={stats?.masteryPercent || 0} />
              </div>

              <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                <StatCard icon={Layers} value={stats?.totalCards || 0} label="Total Cards" color="cyan" />
                <StatCard icon={Flame} value={stats?.dueCards || 0} label="Due Now" color="red" />
                <StatCard icon={Activity} value={stats?.learningCards || 0} label="In Progress" color="purple" />
                <StatCard icon={Target} value={stats?.masteredCards || 0} label="Mastered" color="emerald" />
              </div>
            </div>

            {/* Primary CTA */}
            <div className="flex justify-center mt-8">
              <button
                onClick={() => navigate(`/flashcards/${id}/review`)}
                className="flex items-center gap-2 px-12 py-3 rounded-xl bg-cyan-600 text-white font-bold hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-500/20"
              >
                <Play className="h-5 w-5 fill-current" />
                Start Review Session
              </button>
            </div>
          </DarkCard>
        </motion.div>

        {/* Quick Actions & Cards Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Quick Actions Panel */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <DarkCard padding="md" className="h-full">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <Wand2 className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-white">Quick Actions</h3>
              </div>

              <div className="space-y-3">
                <QuickAction icon={BookOpen} label="Browse All Cards" onClick={() => { }} />
                <QuickAction icon={BarChart3} label="View Analytics" onClick={() => { }} />
                <QuickAction icon={Sparkles} label="AI Study Tips" onClick={() => { }} />
              </div>

              {/* AI Suggestion Banner */}
              <DarkCard className="mt-6 p-4 bg-white/[0.02]">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                      AI Insight
                    </p>
                    <p className="text-sm text-slate-400">
                      You have {stats?.dueCards || 0} cards due. Consider a quick 10-min review session.
                    </p>
                  </div>
                </div>
              </DarkCard>

              {/* Import Action (Footer) */}
              <div className="mt-4 pt-4 border-t border-white/5">
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-slate-500 hover:text-cyan-400 transition-colors uppercase tracking-wider"
                >
                  <Upload className="w-3 h-3" />
                  Import from CSV
                </button>
              </div>
            </DarkCard>
          </motion.div>

          {/* Cards Gallery */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <DarkCard padding="none" className="overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Cards</h3>
                    <p className="text-xs text-slate-500">{cards?.length || 0} cards in this deck</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/flashcards/${id}/cards/new`)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-500 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Card
                </button>
              </div>

              {/* Cards List */}
              <div className="p-4 max-h-[500px] overflow-y-auto scrollbar-hide space-y-3">
                {cardsLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 text-cyan-500 animate-spin mx-auto" />
                    <p className="text-slate-400 font-mono text-sm mt-4">Loading cards...</p>
                  </div>
                ) : !cards || cards.length === 0 ? (
                  <EmptyState
                    icon={<Layers className="h-12 w-12" />}
                    title="No cards yet"
                    description="Create your first card to begin"
                    action={{
                      label: "Create First Card",
                      onClick: () => navigate(`/flashcards/${id}/cards/new`),
                    }}
                  />
                ) : (
                  cards.map((card, index) => (
                    <CardItem
                      key={card.id}
                      card={card}
                      index={index}
                      onEdit={(cardId) => navigate(`/flashcards/${id}/cards/${cardId}/edit`)}
                      onDelete={() => { }}
                    />
                  ))
                )}
              </div>
            </DarkCard>
          </motion.div>
        </div>
      </motion.div>

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        deckId={id}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}
