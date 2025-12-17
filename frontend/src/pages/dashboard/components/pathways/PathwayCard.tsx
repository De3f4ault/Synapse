import { CheckCircle2, Circle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PathwayCardProps {
  topic: {
    id: string;
    title: string;
    status: string;
    completionPercentage: number;
    accuracy: number;
  };
  index: number;
}

export function PathwayCard({ topic, index }: PathwayCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "flex items-center justify-between p-4 rounded-lg border transition-all",
        topic.status === 'mastered'
          ? "bg-green-500/10 border-green-500/20"
          : topic.status === 'in-progress'
            ? "bg-blue-500/10 border-blue-500/20"
            : "bg-slate-800/50 border-slate-700 hover:bg-slate-800"
      )}
    >
      <div className="flex items-center gap-3">
        {topic.status === 'mastered' ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : topic.status === 'in-progress' ? (
          <Circle className="w-5 h-5 text-blue-500" />
        ) : (
          <Lock className="w-5 h-5 text-slate-600" />
        )}

        <div>
          <h4 className={cn(
            "font-medium",
            topic.status === 'available' && "text-slate-500"
          )}>
            {topic.title}
          </h4>
          {topic.status !== 'available' && (
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>{topic.accuracy}% Accuracy</span>
            </div>
          )}
        </div>
      </div>

      {topic.status !== 'available' && (
        <div className="text-right">
          <span className="text-sm font-bold">{topic.completionPercentage}%</span>
        </div>
      )}
    </motion.div>
  );
}
