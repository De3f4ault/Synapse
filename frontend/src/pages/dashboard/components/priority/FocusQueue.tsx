/**
 * FocusQueue - What to study today (renamed from queue)
 * Displays prioritized action items grouped by urgency
 */

import { Target, Clock, AlertCircle } from 'lucide-react';
import { QueueSection } from './QueueSection';
import { useFocusQueue } from '../../hooks/useFocusQueue';
import GlassCard from '../shared/GlassCard';
import type { DashboardData } from '../../types/dashboard.types';

interface FocusQueueProps {
  data: DashboardData | undefined;
}

export function FocusQueue({ data }: FocusQueueProps) {
  const { sections, stats, isLoading, isEmpty } = useFocusQueue(data);

  if (isLoading) {
    return (
      <GlassCard className="p-6">
      <div className="animate-pulse space-y-4">
      <div className="h-6 bg-white/10 rounded w-1/3" />
      <div className="space-y-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-16 bg-white/10 rounded" />
      ))}
      </div>
      </div>
      </GlassCard>
    );
  }

  if (isEmpty) {
    return (
      <GlassCard className="p-6">
      <div className="flex items-center gap-2 mb-4">
      <Target className="w-5 h-5 text-cyan-400" />
      <h3 className="text-lg font-semibold text-white">Focus Queue</h3>
      </div>
      <div className="text-center py-12">
      <Clock className="w-16 h-16 mx-auto text-slate-600 mb-4" />
      <p className="text-slate-400 font-semibold">All caught up!</p>
      <p className="text-sm text-slate-500 mt-2">No pending items right now</p>
      </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
    <div className="space-y-4">
    {/* Header */}
    <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
    <Target className="w-5 h-5 text-cyan-400" />
    <h3 className="text-lg font-semibold text-white">Focus Queue</h3>
    </div>
    <div className="flex items-center gap-3 text-xs text-slate-500">
    <span>{stats.totalItems} items</span>
    {stats.dueToday > 0 && (
      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/10 border border-orange-500/30">
      <AlertCircle className="w-3 h-3 text-orange-400" />
      <span className="font-semibold text-orange-400">{stats.dueToday} due</span>
      </div>
    )}
    </div>
    </div>

    {/* Stats Summary */}
    <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-white/5 border border-white/5">
    <div className="text-center">
    <p className="text-xs text-slate-500 uppercase">Due Today</p>
    <p className="text-lg font-bold text-orange-400">{stats.dueToday}</p>
    </div>
    <div className="text-center">
    <p className="text-xs text-slate-500 uppercase">High Priority</p>
    <p className="text-lg font-bold text-red-400">{stats.highPriority}</p>
    </div>
    <div className="text-center">
    <p className="text-xs text-slate-500 uppercase">Est. Time</p>
    <p className="text-lg font-bold text-cyan-400">{stats.estimatedTotalMinutes}m</p>
    </div>
    </div>

    {/* Queue Sections */}
    <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
    {sections.map((section, index) => (
      <QueueSection
      key={section.id}
      section={section}
      index={index}
      />
    ))}
    </div>
    </div>
    </GlassCard>
  );
}
