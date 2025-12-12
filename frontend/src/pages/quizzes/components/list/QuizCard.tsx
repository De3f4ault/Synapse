import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, FileQuestion, Trophy, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuizResponse } from '@/api/generated/types.gen';
import type { DifficultyColors } from '../../types/quizzes.types';

interface QuizCardProps {
    quiz: QuizResponse;
    onStart: () => void;
    variants?: any;
}

/**
 * Get difficulty color scheme
 */
function getDifficultyColors(difficulty?: string): DifficultyColors {
    const diff = difficulty?.toLowerCase();

    if (diff === 'hard' || diff === 'expert') {
        return {
            border: 'border-red-500/20 hover:border-red-500/50',
            gradient: 'from-red-900/20',
            badge: 'bg-red-500/10 text-red-400 border-red-500/20',
            icon: 'bg-red-500/10 text-red-400 border-red-500/20',
            play: 'bg-red-500 shadow-red-500/50',
        };
    }

    if (diff === 'medium') {
        return {
            border: 'border-purple-500/20 hover:border-purple-500/50',
            gradient: 'from-purple-900/20',
            badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            icon: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            play: 'bg-purple-500 shadow-purple-500/50',
        };
    }

    return {
        border: 'border-cyan-500/20 hover:border-cyan-500/50',
        gradient: 'from-cyan-900/20',
        badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        icon: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        play: 'bg-cyan-500 shadow-cyan-500/50',
    };
}

/**
 * Individual quiz card with military styling
 */
export const QuizCard: React.FC<QuizCardProps> = ({ quiz, onStart, variants }) => {
    const colors = getDifficultyColors(quiz.difficulty);

    return (
        <motion.div variants={variants} layout>
        <motion.div
        whileHover={{ scale: 1.02, y: -5 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
            'group relative h-64 rounded-2xl bg-[#0A0A0A] border overflow-hidden flex flex-col transition-all cursor-pointer',
            colors.border,
            'hover:shadow-[0_0_40px_rgba(0,0,0,0.6)]'
        )}
        onClick={onStart}
        >
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />
        <div className={cn('absolute inset-0 bg-gradient-to-b via-transparent to-transparent opacity-50', colors.gradient)} />

        {/* Header */}
        <div className="p-6 relative z-10 flex-1">
        <div className="flex justify-between items-start mb-4">
        <div className={cn('p-2.5 rounded-lg border', colors.icon)}>
        <Cpu size={20} />
        </div>
        <div className={cn('px-2 py-1 rounded border text-[10px] font-mono uppercase tracking-wider', colors.badge)}>
        {quiz.difficulty || 'Standard'}
        </div>
        </div>

        <h3 className="text-xl font-bold text-white font-serif mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-400 transition-all line-clamp-2 leading-tight">
        {quiz.title}
        </h3>
        <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
        {quiz.description || 'No tactical briefing available for this simulation.'}
        </p>
        </div>

        {/* Footer Stats */}
        <div className="mt-auto p-6 border-t border-white/5 flex items-center justify-between relative z-10 bg-black/40 backdrop-blur-sm">
        <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
        <span className="flex items-center gap-1.5">
        <FileQuestion size={12} />
        {quiz.question_count || 0} Qs
        </span>
        <span className="flex items-center gap-1.5">
        <Trophy size={12} />
        {quiz.time_limit_minutes ? `${quiz.time_limit_minutes}m` : '∞'}
        </span>
        </div>
        <motion.div
        className={cn('p-2 rounded-full text-black opacity-0 group-hover:opacity-100 transition-opacity', colors.play)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        >
        <Play size={16} fill="currentColor" />
        </motion.div>
        </div>
        </motion.div>
        </motion.div>
    );
};
