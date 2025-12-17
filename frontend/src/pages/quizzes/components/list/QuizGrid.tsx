import React from 'react';
import { motion } from 'framer-motion';
import { FileQuestion, Wand2 } from 'lucide-react';
import { QuizCard } from './QuizCard';
import type { QuizResponse } from '@/api/generated';

interface QuizGridProps {
    quizzes: QuizResponse[];
    onStartQuiz: (quizId: number) => void;
    onCreateNew?: () => void;
    searchQuery?: string;
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
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

/**
 * Grid display for quizzes with empty state
 */
export const QuizGrid: React.FC<QuizGridProps> = ({
    quizzes,
    onStartQuiz,
    onCreateNew,
    searchQuery = '',
}) => {
    if (quizzes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-32 border border-white/5 border-dashed rounded-2xl bg-white/[0.02]">
            <FileQuestion className="w-16 h-16 text-slate-600 mb-6 opacity-50" />
            <h3 className="text-xl font-serif font-bold text-white mb-2">
            {searchQuery ? 'No Simulations Found' : 'No Active Simulations'}
            </h3>
            <p className="text-slate-500 font-mono text-xs tracking-[0.2em] uppercase mb-6">
            {searchQuery ? 'Adjust Search Parameters' : 'Construct Your First Simulation'}
            </p>
            {!searchQuery && onCreateNew && (
                <button
                onClick={onCreateNew}
                className="px-6 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-300 text-xs font-bold uppercase tracking-widest transition-all"
                >
                <Wand2 className="inline mr-2 h-4 w-4" />
                Initialize Architect
                </button>
            )}
            </div>
        );
    }

    return (
        <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10"
        >
        {quizzes.map((quiz) => (
            <QuizCard
            key={quiz.id}
            quiz={quiz}
            variants={cardVariants}
            onStart={() => onStartQuiz(quiz.id)}
            />
        ))}
        </motion.div>
    );
};
