/**
 * PriorityItem - Individual queue item
 * Single actionable item in the priority queue
 */

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, BookOpen, FileText, Upload, MessageSquare, Brain } from 'lucide-react';
import { cn, formatDueDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { ModuleBadge } from '../shared/ModuleBadge';
import type { QueueItem } from '../../types/priority.types';

interface PriorityItemProps {
  item: QueueItem;
  index: number;
}

export function PriorityItem({ item, index }: PriorityItemProps) {
  const navigate = useNavigate();

  const getModuleIcon = () => {
    switch (item.moduleType) {
      case 'flashcards':
        return BookOpen;
      case 'notes':
        return FileText;
      case 'documents':
        return Upload;
      case 'chat':
        return MessageSquare;
      case 'quizzes':
        return Brain;
      default:
        return BookOpen;
    }
  };

  const ModuleIcon = getModuleIcon();

  const getPriorityBorder = () => {
    if (item.priority >= 0.8) return 'border-red-500/30';
    if (item.priority >= 0.6) return 'border-orange-500/30';
    if (item.priority >= 0.4) return 'border-cyan-500/30';
    return 'border-slate-500/30';
  };

  return (
    <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.02 }}
    className={cn(
      "group p-3 rounded-lg bg-white/5 border hover:bg-white/10 transition-all cursor-pointer",
      getPriorityBorder()
    )}
    onClick={() => navigate(item.actionUrl)}
    >
    <div className="flex items-start gap-3">
    {/* Icon */}
    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
    <ModuleIcon className="w-5 h-5 text-slate-400" />
    </div>

    {/* Content */}
    <div className="flex-1 min-w-0">
    <div className="flex items-start justify-between gap-2 mb-1">
    <h5 className="font-semibold text-white text-sm truncate group-hover:text-cyan-400 transition-colors">
    {item.title}
    </h5>
    <ModuleBadge moduleType={item.moduleType} size="sm" />
    </div>

    {item.description && (
      <p className="text-xs text-slate-400 mb-2 line-clamp-2">
      {item.description}
      </p>
    )}

    <div className="flex items-center gap-3 text-xs text-slate-500">
    {item.estimatedMinutes && (
      <div className="flex items-center gap-1">
      <Clock className="w-3 h-3" />
      <span>{item.estimatedMinutes}m</span>
      </div>
    )}
    {item.dueDate && (
      <div className={cn(
        "flex items-center gap-1",
        new Date(item.dueDate) < new Date() ? "text-red-400" : ""
      )}>
      <span>{formatDueDate(item.dueDate)}</span>
      </div>
    )}
    <div className="ml-auto">
    <span className="text-cyan-400 font-semibold">
    {Math.round(item.priority * 100)}% priority
    </span>
    </div>
    </div>
    </div>

    {/* Action */}
    <Button
    size="sm"
    variant="ghost"
    className="opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400 hover:text-cyan-300"
    onClick={(e) => {
      e.stopPropagation();
      navigate(item.actionUrl);
    }}
    >
    <ArrowRight className="h-4 w-4" />
    </Button>
    </div>
    </motion.div>
  );
}
