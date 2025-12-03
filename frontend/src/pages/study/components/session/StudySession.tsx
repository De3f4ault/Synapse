/**
 * StudySession - Main study session component
 *
 * Fixed version with proper hook integration
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { X, Brain, FileQuestion, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudySession } from '../../hooks/useStudySession';
import { SessionTimer } from './SessionTimer';
import { SessionControls } from './SessionControls';
import type { StudyItem, StudySessionResponse } from '../../types/study.types';

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
            >
            <Card>
            <CardHeader>
            <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Session Complete! 🎉</h2>
            <p className="text-muted-foreground">
            Great work! Here's how you did:
            </p>
            </div>
            </CardHeader>
            <CardContent className="space-y-6">
            {/* Stats Display */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-secondary rounded-lg">
            <p className="text-2xl font-bold">{session.stats.completedItems}</p>
            <p className="text-sm text-muted-foreground">Items Completed</p>
            </div>
            <div className="text-center p-4 bg-secondary rounded-lg">
            <p className="text-2xl font-bold">{session.stats.correctItems}</p>
            <p className="text-sm text-muted-foreground">Correct</p>
            </div>
            <div className="text-center p-4 bg-secondary rounded-lg">
            <p className="text-2xl font-bold">{Math.round(session.stats.accuracy)}%</p>
            <p className="text-sm text-muted-foreground">Accuracy</p>
            </div>
            <div className="text-center p-4 bg-secondary rounded-lg">
            <p className="text-2xl font-bold">{Math.floor(session.stats.timeSpent / 60)}m</p>
            <p className="text-sm text-muted-foreground">Time Spent</p>
            </div>
            </div>

            <div className="flex gap-3 justify-center">
            <Button
            variant="outline"
            onClick={() => onComplete(sessionResponse)}
            >
            Back to Study
            </Button>
            <Button onClick={() => onComplete(sessionResponse)}>
            View Analytics
            </Button>
            </div>
            </CardContent>
            </Card>
            </motion.div>
        );
    }

    if (!currentItem) {
        return <div className="text-center">Loading session...</div>;
    }

    const Icon = getItemIcon(currentItem.type);

    return (
        <div className="space-y-6">
        {/* Header with timer and cancel */}
        <div className="flex items-center justify-between">
        <SessionTimer
        elapsedTime={elapsedTime}
        isPaused={session.status === 'paused'}
        onPause={pauseSession}
        onResume={resumeSession}
        />
        <Button
        variant="ghost"
        size="sm"
        onClick={() => {
            if (confirm('Cancel this session? Progress will be lost.')) {
                cancelSession();
                onCancel();
            }
        }}
        >
        <X className="h-4 w-4 mr-2" />
        Cancel
        </Button>
        </div>

        {/* Progress */}
        <div className="space-y-2">
        <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
        Item {session.currentIndex + 1} of {items.length}
        </span>
        <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        </div>

        {/* Current Item Card */}
        <AnimatePresence mode="wait">
        <motion.div
        key={currentItem.id}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
        >
        <Card className="border-2">
        <CardContent className="pt-8 pb-8 space-y-6">
        {/* Item Header */}
        <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="capitalize">
        {currentItem.type}
        </Badge>
        {currentItem.difficulty && (
            <Badge variant="secondary">
            Level {currentItem.difficulty}/5
            </Badge>
        )}
        </div>
        <h3 className="text-2xl font-bold">{currentItem.title}</h3>
        </div>
        </div>

        {/* Item Content - Placeholder for actual implementation */}
        <div className="p-6 bg-secondary/30 rounded-lg min-h-[200px] flex items-center justify-center">
        <p className="text-muted-foreground text-center">
        [Item content would appear here]
        <br />
        <span className="text-xs mt-2 block">
        Render flashcard front/back or quiz question based on type
        </span>
        </p>
        </div>

        {/* Stats */}
        <div className="flex justify-between text-sm text-muted-foreground border-t pt-4">
        <div>
        Streak: <span className="font-bold text-foreground">{session.stats.streak}</span>
        </div>
        <div>
        Accuracy: <span className="font-bold text-foreground">{Math.round(session.stats.accuracy)}%</span>
        </div>
        <div>
        Completed: <span className="font-bold text-foreground">
        {session.stats.completedItems}/{session.stats.totalItems}
        </span>
        </div>
        </div>
        </CardContent>
        </Card>
        </motion.div>
        </AnimatePresence>

        {/* Controls */}
        <SessionControls
        onCorrect={() => handleAnswer(true)}
        onIncorrect={() => handleAnswer(false)}
        onSkip={handleSkip}
        disabled={session.status === 'paused'}
        />

        {/* Pause overlay */}
        <AnimatePresence>
        {session.status === 'paused' && (
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
            >
            <Card className="max-w-md">
            <CardContent className="pt-6 text-center space-y-4">
            <h3 className="text-xl font-bold">Session Paused</h3>
            <p className="text-muted-foreground">
            Take a break. Resume when you're ready.
            </p>
            <Button onClick={resumeSession} size="lg">
            Resume Session
            </Button>
            </CardContent>
            </Card>
            </motion.div>
        )}
        </AnimatePresence>
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
