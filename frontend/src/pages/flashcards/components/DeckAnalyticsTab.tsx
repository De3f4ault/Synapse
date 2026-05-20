/**
 * DeckAnalyticsTab
 *
 * Redesigned for the w-80 left panel context.
 * - Vertical stack — no grid that never renders at 320px
 * - System colors only: primary, muted, warning, destructive, accent-olive
 * - No hardcoded hex values
 */

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Target,
  BookOpen,
  TrendingUp,
  Flame,
  AlertCircle,
  Loader2,
  Calendar,
  Zap,
} from 'lucide-react';
import { AnalyticsService } from '@/api/generated';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

interface StudyTrendPoint {
  date: string;
  cards_reviewed: number;
  avg_quality: number;
}

interface WeakCard {
  card_id: number;
  front_text: string;
  topic?: string | null;
  times_incorrect?: number;
  accuracy: number;
}

interface MasteryDistribution {
  new: number;
  learning: number;
  review: number;
  mastered: number;
}

interface DeckAnalytics {
  deck_id: number;
  total_cards: number;
  mastery_distribution: MasteryDistribution;
  recall_rate: number | null;
  projected_mastery_date: string | null;
  study_time_trend: StudyTrendPoint[];
  consistency_window: Record<string, number>;
  weak_cards: WeakCard[];
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

// All colors are CSS variables — zero hardcoded values
const STATE_CSS: Record<string, string> = {
  new:      'hsl(var(--muted-foreground))',
  learning: 'hsl(var(--warning))',
  review:   'hsl(var(--primary))',
  mastered: '#788c5d', // accent-olive — defined in tailwind.config.ts
};

const STATE_LABELS: Record<string, string> = {
  new: 'New', learning: 'Learning', review: 'Review', mastered: 'Mastered',
};

// ─────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">
      {children}
    </p>
  );
}

// ─── Projected Mastery ────────────────────────────────────

function ProjectedMasteryCard({ date }: { date: string | null }) {
  if (!date) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Target size={14} className="text-muted-foreground" />
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Projected Mastery</p>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">Keep studying to unlock</p>
        </div>
      </div>
    );
  }

  const target   = new Date(date);
  const now      = new Date();
  const daysLeft = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 86400000));
  const formatted = target.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="p-4 rounded-xl bg-card border border-primary/25">
      <div className="flex items-center gap-2 mb-2">
        <Target size={12} className="text-primary" />
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary/70">Projected Mastery</p>
      </div>
      <p className="text-base font-bold text-foreground">{formatted}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">
        {daysLeft === 0 ? 'Today — great work!' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} away`}
      </p>
    </div>
  );
}

// ─── Quick Stat Row ───────────────────────────────────────

function StatPill({
  label,
  value,
  color = 'text-foreground',
  icon,
}: {
  label: string;
  value: string;
  color?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border">
      <div className="shrink-0 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground leading-none">{label}</p>
        <p className={cn('text-sm font-bold tabular-nums mt-0.5 leading-none', color)}>{value}</p>
      </div>
    </div>
  );
}

// ─── Mastery Distribution Bar ─────────────────────────────

function MasteryBar({ dist, total }: { dist: MasteryDistribution; total: number }) {
  const states = [
    { key: 'new', count: dist.new },
    { key: 'learning', count: dist.learning },
    { key: 'review', count: dist.review },
    { key: 'mastered', count: dist.mastered },
  ] as const;

  return (
    <div className="space-y-2.5">
      {/* Stacked bar */}
      <div className="flex h-2.5 rounded-full overflow-hidden bg-foreground/10">
        {states.map(({ key, count }) => {
          const pct = total > 0 ? (count / total) * 100 : 0;
          return pct > 0 ? (
            <div
              key={key}
              style={{ width: `${pct}%`, background: STATE_CSS[key] }}
              title={`${STATE_LABELS[key]}: ${count}`}
            />
          ) : null;
        })}
      </div>
      {/* Legend — 2x2 grid fits w-80 perfectly */}
      <div className="grid grid-cols-2 gap-1.5">
        {states.map(({ key, count }) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: STATE_CSS[key] }} />
            <span className="text-[10px] text-muted-foreground">{STATE_LABELS[key]}</span>
            <span className="text-[10px] font-bold text-foreground ml-auto tabular-nums">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Consistency Heatmap ──────────────────────────────────

function ConsistencyHeatmap({ data }: { data: Record<string, number> }) {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d   = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().split('T')[0]!;
    const count = (data ?? {})[key] ?? 0;
    return { key, count, label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) };
  });

  const max = Math.max(...days.map((d) => d.count), 1);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {days.map(({ key, count, label }) => {
          const intensity = count === 0 ? 0 : Math.max(0.2, count / max);
          return (
            <div
              key={key}
              title={`${label}: ${count} review${count !== 1 ? 's' : ''}`}
              className="w-5 h-5 rounded-sm cursor-help transition-opacity"
              style={{
                background: count === 0
                  ? 'hsl(var(--muted))'
                  : `hsl(var(--primary) / ${intensity})`,
                border: '1px solid hsl(var(--border))',
              }}
            />
          );
        })}
      </div>
      <p className="text-[9px] text-muted-foreground">Each square = 1 day · Darker = more reviews</p>
    </div>
  );
}

// ─── 30-Day Trend Chart ───────────────────────────────────

function StudyTrendChart({ data }: { data: StudyTrendPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <TrendingUp size={20} className="opacity-30" />
        <p className="text-xs">No review history yet</p>
      </div>
    );
  }

  const formatted = data.slice(-30).map((d) => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    quality_pct: Math.round(d.avg_quality * 20),
  }));

  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={formatted} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <defs>
          <linearGradient id="cardGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="qualGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#788c5d" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#788c5d" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="dateLabel"
          tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false} axisLine={false}
          interval={Math.floor(formatted.length / 5)}
        />
        <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '10px',
            fontSize: '11px',
            color: 'hsl(var(--foreground))',
          }}
          formatter={(val: number, name: string) =>
            name === 'cards_reviewed' ? [`${val} cards`, 'Reviewed'] : [`${val}%`, 'Avg Quality']
          }
        />
        <Area type="monotone" dataKey="cards_reviewed" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#cardGrad)" dot={false} />
        <Area type="monotone" dataKey="quality_pct" stroke="#788c5d" strokeWidth={1.5} fill="url(#qualGrad)" dot={false} strokeDasharray="4 2" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Weak Cards ───────────────────────────────────────────

function WeakCardsList({
  cards,
  onOpenTutor,
}: {
  cards: WeakCard[];
  onOpenTutor?: (cardId: number) => void;
}) {
  if (!cards || cards.length === 0) {
    return (
      <div className="flex items-center gap-2 py-3 text-muted-foreground">
        <Zap size={14} className="text-accent-olive" />
        <p className="text-xs">No weak cards — great work!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {cards.slice(0, 5).map((card) => {
        const cardId = card.card_id ?? (card as any).id;
        const accuracy = card.accuracy ?? 0;

        return (
          <div
            key={cardId}
            className="p-3 rounded-xl bg-card border border-border hover:border-destructive/30 transition-colors"
          >
            <p className="text-xs font-medium text-foreground line-clamp-2 mb-2">{card.front_text ?? '(no text)'}</p>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-destructive/80 font-mono">{accuracy.toFixed(1)}% accuracy</span>
              {onOpenTutor && cardId != null && (
                <button
                  onClick={() => onOpenTutor(cardId)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg border border-primary/30 text-primary text-[10px] font-semibold hover:bg-primary/5 transition-colors"
                >
                  <BookOpen size={10} />
                  Tutor
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────────────────

interface DeckAnalyticsTabProps {
  deckId: number;
  onOpenTutor?: (cardId: number) => void;
}

export function DeckAnalyticsTab({ deckId, onOpenTutor }: DeckAnalyticsTabProps) {
  const { data, isLoading, error } = useQuery<DeckAnalytics>({
    queryKey: ['deck-analytics', deckId],
    queryFn: () => AnalyticsService.getDeckAnalyticsApiV1CollectionsDecksDeckIdAnalyticsGet(deckId) as Promise<DeckAnalytics>,
    enabled: !!deckId,
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 gap-3 text-muted-foreground">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-xs">Loading analytics…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-40 gap-3 text-muted-foreground">
        <AlertCircle size={16} className="text-destructive/60" />
        <span className="text-xs">Analytics unavailable</span>
      </div>
    );
  }

  const totalCards = data.total_cards ?? 0;
  const recallPct  = data.recall_rate != null ? `${(data.recall_rate * 100).toFixed(0)}%` : '—';
  const masteredCount = data.mastery_distribution?.mastered ?? 0;
  const masteryPct = totalCards > 0 ? `${Math.round((masteredCount / totalCards) * 100)}%` : '—';

  const recallColor =
    data.recall_rate == null    ? 'text-muted-foreground'
    : data.recall_rate >= 0.8  ? 'text-accent-olive'
    : data.recall_rate >= 0.5  ? 'text-warning'
    : 'text-destructive';

  // Streak: trailing consecutive days with reviews
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0]!;
    if ((data.consistency_window?.[key] ?? 0) > 0) streak++;
    else break;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 space-y-5 overflow-y-auto"
    >
      {/* Projected mastery */}
      <ProjectedMasteryCard date={data.projected_mastery_date ?? null} />

      {/* Quick stats — 2-col grid (perfect for w-80) */}
      <div>
        <SectionLabel>Overview</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <StatPill
            label="Total Cards"
            value={String(totalCards)}
            icon={<BookOpen size={13} />}
          />
          <StatPill
            label="Recall Rate"
            value={recallPct}
            color={recallColor}
            icon={<TrendingUp size={13} />}
          />
          <StatPill
            label="Mastered"
            value={masteryPct}
            color="text-accent-olive"
            icon={<Target size={13} />}
          />
          <StatPill
            label="Streak"
            value={`${streak}d`}
            color={streak >= 3 ? 'text-warning' : 'text-foreground'}
            icon={<Flame size={13} className={streak >= 3 ? 'text-warning' : 'text-muted-foreground'} />}
          />
        </div>
      </div>

      {/* Study trend */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <SectionLabel>30-Day Trend</SectionLabel>
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
              <span className="w-2 h-0.5 rounded-full bg-primary inline-block" />Cards
            </span>
            <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
              <span className="w-2 h-0.5 rounded-full inline-block" style={{ background: '#788c5d' }} />Quality
            </span>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <StudyTrendChart data={data.study_time_trend ?? []} />
        </div>
      </div>

      {/* State distribution */}
      {data.mastery_distribution && (
        <div>
          <SectionLabel>State Distribution</SectionLabel>
          <div className="bg-card border border-border rounded-xl p-3">
            <MasteryBar dist={data.mastery_distribution} total={totalCards} />
          </div>
        </div>
      )}

      {/* Consistency heatmap */}
      <div>
        <SectionLabel>30-Day Activity</SectionLabel>
        <div className="bg-card border border-border rounded-xl p-3">
          <ConsistencyHeatmap data={data.consistency_window ?? {}} />
        </div>
      </div>

      {/* Weak cards */}
      {(data.weak_cards?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertCircle size={11} className="text-destructive/70" />
            <SectionLabel>Needs Attention · {data.weak_cards.length}</SectionLabel>
          </div>
          <WeakCardsList cards={data.weak_cards} onOpenTutor={onOpenTutor} />
        </div>
      )}

      {/* Bottom spacer */}
      <div className="h-4" />
    </motion.div>
  );
}
