/**
 * StudyHeatmap - Activity calendar visualization
 * GitHub-style contribution heatmap for study activity
 */

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import GlassCard from '../shared/GlassCard';
import type { HeatmapData } from '@/api/generated';

interface StudyHeatmapProps {
  data: HeatmapData[];
}

export function StudyHeatmap({ data }: StudyHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<HeatmapData | null>(null);

  // Generate last 365 days
  const generateDays = () => {
    const days: (HeatmapData | null)[] = [];
    const today = new Date();

    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const activity = data.find(d => d.date === dateStr);
      days.push(activity || { date: dateStr, activity_count: 0 });
    }

    return days;
  };

  const days = generateDays();
  const maxActivity = Math.max(...data.map(d => d.activity_count), 1);

  const getIntensity = (count: number) => {
    if (count === 0) return 'bg-white/5';
    const ratio = count / maxActivity;
    if (ratio > 0.75) return 'bg-green-500';
    if (ratio > 0.5) return 'bg-green-400';
    if (ratio > 0.25) return 'bg-green-300';
    return 'bg-green-200';
  };

  // Group by weeks
  const weeks: (HeatmapData | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <GlassCard className="p-6">
    <div className="space-y-4">
    {/* Header */}
    <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
    <Calendar className="w-5 h-5 text-purple-400" />
    <h3 className="text-lg font-semibold text-white">Activity Heatmap</h3>
    </div>
    <div className="text-xs text-slate-500">
    {data.filter(d => d.activity_count > 0).length} active days
    </div>
    </div>

    {/* Heatmap Grid */}
    <div className="overflow-x-auto">
    <div className="flex gap-1">
    {weeks.map((week, weekIdx) => (
      <div key={weekIdx} className="flex flex-col gap-1">
      {week.map((day, dayIdx) => (
        <div
        key={dayIdx}
        className={cn(
          "w-3 h-3 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-white/30",
          day ? getIntensity(day.activity_count) : 'bg-white/5'
        )}
        onMouseEnter={() => day && setHoveredDay(day)}
        onMouseLeave={() => setHoveredDay(null)}
        />
      ))}
      </div>
    ))}
    </div>
    </div>

    {/* Legend */}
    <div className="flex items-center justify-between pt-4 border-t border-white/5">
    <div className="flex items-center gap-2">
    <span className="text-xs text-slate-500">Less</span>
    <div className="flex gap-1">
    {['bg-white/5', 'bg-green-200', 'bg-green-300', 'bg-green-400', 'bg-green-500'].map((color, i) => (
      <div key={i} className={cn("w-3 h-3 rounded-sm", color)} />
    ))}
    </div>
    <span className="text-xs text-slate-500">More</span>
    </div>

    {hoveredDay && (
      <div className="text-xs text-white">
      {new Date(hoveredDay.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })}: {hoveredDay.activity_count} activities
      </div>
    )}
    </div>
    </div>
    </GlassCard>
  );
}
