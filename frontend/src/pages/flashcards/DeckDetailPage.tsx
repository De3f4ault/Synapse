/**
 * DeckDetailPage - Standardized Neumorphic Design
 * Aligned with DecksPage, ReviewPage, CreateDeckPage patterns
 */

import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { useDeck, useDeckStats, useUpdateDeck } from "./hooks/useDecks";
import { useDeleteCard } from "./hooks/useCards";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { FlashcardsService } from "@/api/generated";
import { DeckSettings } from "./components/deck/DeckSettings";
import {
  NeumorphicCard,
  NeumorphicButton,
  NeumorphicBadge,
} from "@/components/neumorphic";
import { cn } from "@/lib/utils";
import type { Flashcard, LearningState } from "./types/flashcards.types";

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
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
};

// Stat Card Component - Neumorphic Style
function StatCard({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  color: "cyan" | "purple" | "red" | "emerald" | "amber";
}) {
  const colorClasses = {
    cyan: "text-cyan-400",
    purple: "text-purple-400",
    red: "text-red-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
  };

  return (
    <NeumorphicCard className="p-5 text-center flex flex-col justify-center items-center h-32">
      <div
        className={cn(
          "w-10 h-10 rounded-full nm-inset flex items-center justify-center mb-3",
          colorClasses[color],
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
        {label}
      </div>
    </NeumorphicCard>
  );
}

// Mastery Progress Component - Simplified Neumorphic
function MasteryProgress({ percentage }: { percentage: number }) {
  return (
    <NeumorphicCard className="p-8 flex flex-col items-center">
      <div className="relative w-40 h-40 flex items-center justify-center mb-4">
        {/* Circular progress background */}
        <svg
          className="w-full h-full transform -rotate-90"
          viewBox="0 0 100 100"
        >
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
            transition={{ duration: 1, ease: "easeOut" }}
          />
          <defs>
            <linearGradient
              id="progressGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center content */}
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
    </NeumorphicCard>
  );
}

// Card Item Component - Neumorphic Style
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
  const stateColors: Record<
    LearningState,
    { variant: "cyan" | "purple" | "emerald" | "coral" }
  > = {
    new: { variant: "purple" },
    learning: { variant: "coral" },
    review: { variant: "cyan" },
    mastered: { variant: "emerald" },
  };
  const colorConfig = stateColors[card.learning_state] || stateColors.new;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <NeumorphicCard className="p-4 group hover:border-white/10 transition-all">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <NeumorphicBadge
                variant="outline"
                color={colorConfig.variant}
                className="text-[10px]"
              >
                {card.learning_state}
              </NeumorphicBadge>
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
              <div className="w-16 h-1.5 rounded-full nm-inset overflow-hidden">
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
              <NeumorphicButton
                variant="ghost"
                size="icon"
                onClick={() => onEdit(card.id)}
                className="w-7 h-7"
              >
                <Edit className="w-3.5 h-3.5" />
              </NeumorphicButton>
              <NeumorphicButton
                variant="ghost"
                size="icon"
                onClick={() => onDelete(card.id)}
                className="w-7 h-7 hover:text-red-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </NeumorphicButton>
            </div>
          </div>
        </div>
      </NeumorphicCard>
    </motion.div>
  );
}

// Quick Action Button Component - Neumorphic Style
function QuickAction({
  icon: Icon,
  label,
  onClick,
  variant = "default",
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  variant?: "default" | "primary";
}) {
  return (
    <NeumorphicButton
      variant={variant === "primary" ? "primary" : "ghost"}
      onClick={onClick}
      className="w-full justify-start px-4 py-3 h-auto"
    >
      <div
        className={cn(
          "w-8 h-8 rounded-lg nm-inset flex items-center justify-center mr-3",
          variant === "primary" ? "text-cyan-400" : "text-slate-400",
        )}
      >
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-sm font-medium flex-1 text-left">{label}</span>
      <ChevronRight className="w-4 h-4 text-slate-600" />
    </NeumorphicButton>
  );
}

// Main Component
export function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const id = parseInt(deckId || "0", 10);

  // Fetch deck and cards
  const { data: deck, isLoading: deckLoading } = useDeck(id);
  const { data: cardsResponse, isLoading: cardsLoading } = useQuery({
    queryKey: queryKeys.decks.cards(id),
    queryFn: () => FlashcardsService.listDeckCardsApiV1DecksDeckIdCardsGet(id),
    enabled: !!id,
  });
  const cards = cardsResponse as Flashcard[] | undefined;
  const stats = useDeckStats(id);

  // Mutations
  const { mutate: updateDeck } = useUpdateDeck();
  const { mutate: deleteCard } = useDeleteCard();

  // Loading state
  if (deckLoading) {
    return (
      <div className="min-h-screen nm-bg nm-constellation-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full nm-inset flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Brain className="h-8 w-8 text-cyan-500" />
            </motion.div>
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
        <NeumorphicCard className="p-12 flex flex-col items-center text-center max-w-md">
          <div className="w-20 h-20 rounded-full nm-inset flex items-center justify-center mb-6 text-red-400">
            <Brain className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Deck Not Found</h2>
          <p className="text-slate-400 mb-6">
            The requested deck could not be located.
          </p>
          <NeumorphicButton
            onClick={() => navigate("/flashcards")}
            variant="primary"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Flashcards
          </NeumorphicButton>
        </NeumorphicCard>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen nm-bg nm-constellation-bg overflow-hidden flex flex-col">
      <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

      {/* Main Content - Full Width Scrollable Area */}
      <motion.div
        className="flex-1 overflow-y-auto scrollbar-hide p-8 pb-32 space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Navigation */}
        <motion.div variants={itemVariants} className="flex items-center gap-4">
          <NeumorphicButton
            variant="ghost"
            size="icon"
            onClick={() => navigate("/flashcards")}
          >
            <ArrowLeft className="h-5 w-5" />
          </NeumorphicButton>
          <div className="text-sm text-slate-500 font-mono">
            <span
              className="hover:text-cyan-400 cursor-pointer"
              onClick={() => navigate("/flashcards")}
            >
              Flashcards
            </span>
            <span className="mx-2">/</span>
            <span className="text-white">{deck.name}</span>
          </div>
        </motion.div>

        {/* Hero Section */}
        <motion.div variants={itemVariants}>
          <NeumorphicCard className="p-8">
            {/* Header with deck info */}
            <div className="mb-8">
              <DeckSettings
                deck={deck}
                onUpdate={(data) => updateDeck({ deckId: id, data })}
              />
            </div>

            {/* Central Mastery & Stats */}
            <div className="flex flex-col lg:flex-row items-center gap-8">
              {/* Mastery Progress */}
              <div className="flex-shrink-0">
                <MasteryProgress percentage={stats?.masteryPercent || 0} />
              </div>

              {/* Stats Grid */}
              <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                <StatCard
                  icon={Layers}
                  value={stats?.totalCards || 0}
                  label="Total Cards"
                  color="cyan"
                />
                <StatCard
                  icon={Flame}
                  value={stats?.dueCards || 0}
                  label="Due Now"
                  color="red"
                />
                <StatCard
                  icon={Activity}
                  value={stats?.learningCards || 0}
                  label="In Progress"
                  color="purple"
                />
                <StatCard
                  icon={Target}
                  value={stats?.masteredCards || 0}
                  label="Mastered"
                  color="emerald"
                />
              </div>
            </div>

            {/* Primary CTA */}
            <div className="flex justify-center mt-8">
              <NeumorphicButton
                onClick={() => navigate(`/flashcards/${id}/review`)}
                variant="primary"
                size="lg"
                className="px-12"
              >
                <Play className="mr-2 h-5 w-5 fill-current" />
                Start Review Session
              </NeumorphicButton>
            </div>
          </NeumorphicCard>
        </motion.div>

        {/* Quick Actions & Cards Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Quick Actions Panel */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <NeumorphicCard className="p-6 h-full">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg nm-inset flex items-center justify-center text-purple-400">
                  <Wand2 className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-white">Quick Actions</h3>
              </div>

              <div className="space-y-3">
                <QuickAction
                  icon={Plus}
                  label="Add New Card"
                  onClick={() => navigate(`/flashcards/${id}/cards/new`)}
                  variant="primary"
                />
                <QuickAction
                  icon={BookOpen}
                  label="Browse All Cards"
                  onClick={() => { }}
                />
                <QuickAction
                  icon={BarChart3}
                  label="View Analytics"
                  onClick={() => { }}
                />
                <QuickAction
                  icon={Sparkles}
                  label="AI Study Tips"
                  onClick={() => { }}
                />
              </div>

              {/* AI Suggestion Banner */}
              <div className="mt-6 p-4 rounded-xl nm-inset">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg nm-inset flex items-center justify-center flex-shrink-0 text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                      AI Insight
                    </p>
                    <p className="text-sm text-slate-400">
                      You have {stats?.dueCards || 0} cards due. Consider a
                      quick 10-min review session.
                    </p>
                  </div>
                </div>
              </div>
            </NeumorphicCard>
          </motion.div>

          {/* Cards Gallery */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <NeumorphicCard className="p-0 overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl nm-inset flex items-center justify-center text-cyan-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Cards</h3>
                    <p className="text-xs text-slate-500">
                      {cards?.length || 0} cards in this deck
                    </p>
                  </div>
                </div>
                <NeumorphicButton
                  onClick={() => navigate(`/flashcards/${id}/cards/new`)}
                  variant="primary"
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Card
                </NeumorphicButton>
              </div>

              {/* Cards List */}
              <div className="p-4 max-h-[500px] overflow-y-auto scrollbar-hide">
                {cardsLoading ? (
                  <div className="text-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full mx-auto"
                    />
                    <p className="text-slate-400 font-mono text-sm mt-4">
                      Loading cards...
                    </p>
                  </div>
                ) : !cards || cards.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16"
                  >
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl nm-inset flex items-center justify-center">
                      <Layers className="h-8 w-8 text-slate-600" />
                    </div>
                    <p className="text-slate-400 font-medium mb-2">
                      No cards yet
                    </p>
                    <p className="text-slate-500 text-sm mb-6">
                      Create your first card to begin
                    </p>
                    <NeumorphicButton
                      variant="primary"
                      onClick={() => navigate(`/flashcards/${id}/cards/new`)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Card
                    </NeumorphicButton>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {cards.map((card, index) => (
                      <CardItem
                        key={card.id}
                        card={card}
                        index={index}
                        onEdit={(cardId) =>
                          navigate(`/flashcards/${id}/cards/${cardId}/edit`)
                        }
                        onDelete={(cardId) => deleteCard(cardId)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </NeumorphicCard>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
