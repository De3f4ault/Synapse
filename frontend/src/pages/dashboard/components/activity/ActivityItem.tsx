/**
 * ActivityItem - Individual activity entry
 * Single activity log item with icon and timestamp
 */

import { motion } from 'framer-motion';
import {
  BookOpen, FileText, Upload, MessageSquare,
  CheckCircle, Edit, Trash, Eye
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { ActivityLogEntry } from '../../hooks/useSessionTracking';

interface ActivityItemProps {
  activity: ActivityLogEntry;
  index: number;
}

export function ActivityItem({ activity, index }: ActivityItemProps) {
  const getActivityIcon = () => {
    switch (activity.activity_type) {
      case 'review':
        return CheckCircle;
      case 'create':
        return Edit;
      case 'update':
        return Edit;
      case 'delete':
        return Trash;
      case 'view':
        return Eye;
      case 'upload':
        return Upload;
      default:
        return BookOpen;
    }
  };

  const getModuleIcon = () => {
    switch (activity.module) {
      case 'flashcards':
        return BookOpen;
      case 'notes':
        return FileText;
      case 'documents':
        return Upload;
      case 'chat':
        return MessageSquare;
      default:
        return BookOpen;
    }
  };

  const getModuleColor = () => {
    switch (activity.module) {
      case 'flashcards':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'notes':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'documents':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'chat':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  const ActivityIcon = getActivityIcon();
  const ModuleIcon = getModuleIcon();

  const getActivityLabel = () => {
    const actions: Record<string, string> = {
      review: 'Reviewed',
      create: 'Created',
      update: 'Updated',
      delete: 'Deleted',
      view: 'Viewed',
      upload: 'Uploaded',
      complete: 'Completed',
    };
    return actions[activity.activity_type] || activity.activity_type;
  };

  return (
    <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.02 }}
    className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
    >
    {/* Module Icon */}
    <div className={cn(
      "w-8 h-8 rounded-full flex items-center justify-center border flex-shrink-0",
      getModuleColor()
    )}>
    <ModuleIcon className="w-4 h-4" />
    </div>

    {/* Content */}
    <div className="flex-1 min-w-0">
    <div className="flex items-center gap-2">
    <ActivityIcon className="w-3 h-3 text-slate-500" />
    <span className="text-sm text-white">
    {getActivityLabel()}
    </span>
    <span className="text-sm text-slate-400 capitalize">
    {activity.module}
    </span>
    </div>

    {activity.resource_title && (
      <p className="text-xs text-slate-500 mt-1 truncate">
      {activity.resource_title}
      </p>
    )}

    <p className="text-xs text-slate-600 mt-1">
    {formatRelativeTime(activity.timestamp)}
    </p>
    </div>
    </motion.div>
  );
}
