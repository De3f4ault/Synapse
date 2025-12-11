/**
 * StudySession - Main study session component
 */

import { X, Brain, FileQuestion, BookOpen, Clock, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudySession } from '../../hooks/useStudySession';
import { SessionTimer } from './SessionTimer';
import type { StudyItem, StudySessionResponse, StudySessionType } from '../../types/study.types';
import { cn } from '@/lib/utils';

interface StudySessionProps {
    items: StudyItem[];
    sessionType?: 'due' | 'recommended' | 'mixed';
    onComplete: (session: StudySessionResponse) => void;
    onCancel: () => void;
}

export function StudySession({
    items,
    sessionType = 'mixed',
    onComplete,
    onCancel,
}: StudySessionProps) {
    const {
        session,
        currentItem,
        elapsedTime,
        progress,
        handleAnswer,
        handleSkip,
        pauseSession,
        resumeSession,
        cancelSession,
    } = useStudySession(items);

    // Handle session completion
    if (session.status === 'completed') {
        const sessionResponse: StudySessionResponse = {
            id: session.id || 0,
            session_type: sessionType,
            modules_used: ['flashcards', 'quizzes'],
            items_completed: session.stats.completedItems,
            items_correct: session.stats.correctItems,
            accuracy: session.stats.accuracy / 100,
            time_spent_seconds: session.stats.timeSpent,
            started_at: session.startTime.toISOString(),
            ended_at: session.endTime?.toISOString() || null,
            is_completed: true,
        };

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center p-8 h-full min-h-[400px]"
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20 mb-4">
                        <Trophy size={32} className="text-green-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Session Complete!</h2>
                    <p className="text-slate-400">Great work maintaining your momentum.</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-2xl mb-8">
                    <StatCard label="Completed" value={session.stats.completedItems} color="blue" />
                    <StatCard label="Correct" value={session.stats.correctItems} color="green" />
                    <StatCard label="Accuracy" value={Math.round(session.stats.accuracy) + '%'} color="purple" />
                    <StatCard label="Time" value={Math.floor(session.stats.timeSpent / 60) + 'm'} color="cyan" />
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => onComplete(sessionResponse)}
                        className="synapse-button"
                    >
                        Back to Hub
                    </button>
                    <button
                        onClick={() => onComplete(sessionResponse)}
                        className="synapse-button-primary synapse-button"
                    >
                        View Analytics
                    </button>
                </div>
            </motion.div>
        );
    }

    if (!currentItem) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
                    <p className="text-slate-400 uppercase tracking-widest text-xs">Initializing Session...</p>
                </div>
            </div>
        );
    }

    const Icon = getItemIcon(currentItem.type);

    return (
        <div className="relative h-full flex flex-col p-6">
            {/* Header with timer and cancel */}
            <div className="flex items-center justify-between mb-8">
                <SessionTimer
                    elapsedTime={elapsedTime}
                    isPaused={session.status === 'paused'}
                    onPause={pauseSession}
                    onResume={resumeSession}
                />
                <button
                    onClick={() => {
                        if (confirm('Cancel this session? Progress will be lost.')) {
                            cancelSession();
                            onCancel();
                        }
                    }}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Content Area */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentItem.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1 flex flex-col max-w-3xl mx-auto w-full"
                >
                    {/* Progress Bar */}
                    <div className="mb-6">
                        <div className="flex justify-between text-xs text-slate-500 mb-2 font-mono uppercase tracking-wider">
                            <span>Item {session.currentIndex + 1} / {items.length}</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-cyan-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                    </div>

                    {/* Card Container */}
                    <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden flex-1 min-h-[300px] flex flex-col">
                        {/* Type Indicator */}
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-white/5 rounded-lg border border-white/5 text-cyan-400">
                                    <Icon size={20} />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        {currentItem.type}
                                    </div>
                                    <div className="text-lg font-bold text-white line-clamp-1">
                                        {currentItem.title}
                                    </div>
                                </div>
                            </div>
                            {currentItem.difficulty && (
                                <div className={cn(
                                    "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border",
                                    "bg-white/5 border-white/10 text-slate-400"
                                )}>
                                    Level {currentItem.difficulty}
                                </div>
                            )}
                        </div>

                        {/* Content Placeholder */}
                        <div className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed border-white/10 rounded-xl bg-white/[0.02] mb-6">
                            <BookOpen className="w-12 h-12 text-slate-700 mb-4 opacity-50" />
                            <p className="text-slate-500 text-center text-sm max-w-md">
                                Content for this item would be rendered here.
                                <br />
                                <span className="text-xs opacity-50 mt-1 block">
                                    (Flashcard Front/Back, Quiz Question, etc.)
                                </span>
                            </p>
                        </div>

                        {/* Session Controls */}
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => handleSkip()}
                                className="synapse-button justify-center py-4"
                                disabled={session.status === 'paused'}
                            >
                                Skip Item
                            </button>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleAnswer(false)}
                                    className="flex-1 synapse-button hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 justify-center py-4 text-xs"
                                    disabled={session.status === 'paused'}
                                >
                                    Incorrect
                                </button>
                                <button
                                    onClick={() => handleAnswer(true)}
                                    className="flex-1 synapse-button-primary justify-center py-4 flex items-center gap-2"
                                    disabled={session.status === 'paused'}
                                >
                                    Correct
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Pause Overlay */}
            <AnimatePresence>
                {session.status === 'paused' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-2xl"
                    >
                        <div className="text-center p-8">
                            <div className="w-16 h-16 mx-auto bg-white/5 rounded-full flex items-center justify-center border border-white/10 mb-4 animate-pulse">
                                <Clock size={32} className="text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Session Paused</h3>
                            <p className="text-slate-400 text-sm mb-6">Timer stopped. Ready when you are.</p>
                            <button
                                onClick={resumeSession}
                                className="synapse-button-primary synapse-button px-8"
                            >
                                <Play size={16} fill="currentColor" className="mr-2" />
                                Resume
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function StatCard({ label, value, color }: { label: string, value: string | number, color: string }) {
    const colors = {
        blue: 'text-blue-400 shadow-blue-500/20',
        green: 'text-emerald-400 shadow-emerald-500/20',
        purple: 'text-purple-400 shadow-purple-500/20',
        cyan: 'text-cyan-400 shadow-cyan-500/20',
    } as any;

    return (
        <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
            <div className={cn("text-2xl font-bold mb-1", colors[color])}>{value}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
        </div>
    );
}

function getItemIcon(type: string) {
    const icons = {
        flashcard: Brain,
        quiz: FileQuestion,
        note: BookOpen,
    };
    return icons[type as keyof typeof icons] || BookOpen;
}

// Import Trophy separately or add to imports
import { Trophy } from 'lucide-react';
