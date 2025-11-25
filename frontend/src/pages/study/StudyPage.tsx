import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Sparkles, TrendingUp, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { DueItems, Recommendations, StudySession } from '@/modules/study';
import type { StudyItemResponse, StudySessionResponse } from '@/api/generated/types.gen';

/**
 * Study Page - NEW
 *
 * Unified study hub with due items, recommendations, and sessions.
 *
 * Features:
 * - Due items overview
 * - AI-powered recommendations
 * - Active study session management
 * - Module filtering
 * - Statistics dashboard
 */

export function StudyPage() {
    const [activeSession, setActiveSession] = useState<{
        items: StudyItemResponse[];
        type: 'due' | 'recommended';
    } | null>(null);
    const [activeTab, setActiveTab] = useState<'due' | 'recommendations'>('due');

    const handleStartDueSession = (items: StudyItemResponse[]) => {
        setActiveSession({ items, type: 'due' });
    };

    const handleStartRecommendedSession = (items: StudyItemResponse[]) => {
        setActiveSession({ items, type: 'recommended' });
    };

    const handleSessionComplete = (session: StudySessionResponse) => {
        setActiveSession(null);
        // Could show a completion modal here
    };

    const handleCancelSession = () => {
        setActiveSession(null);
    };

    // If there's an active session, show it
    if (activeSession) {
        return (
            <div className="container mx-auto p-6 space-y-6 max-w-4xl">
            <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            >
            <div className="mb-4">
            <Badge variant="outline" className="mb-2">
            {activeSession.type === 'due' ? 'Due Items Session' : 'AI Recommended Session'}
            </Badge>
            <h1 className="text-3xl font-bold">Study Session</h1>
            <p className="text-muted-foreground">
            {activeSession.items.length} items to review
            </p>
            </div>

            <StudySession
            items={activeSession.items}
            sessionType="mixed"
            onComplete={handleSessionComplete}
            onCancel={handleCancelSession}
            />
            </motion.div>
            </div>
        );
    }

    // Default view with tabs
    return (
        <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        >
        <div className="flex items-center gap-3 mb-2">
        <BookOpen className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Study</h1>
        </div>
        <p className="text-muted-foreground">
        Review due items and get AI-powered study recommendations
        </p>
        </motion.div>

        {/* Study Overview Stats */}
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
        <CardContent className="pt-6">
        <div className="flex items-center gap-4">
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
        <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
        <p className="text-2xl font-bold">12</p>
        <p className="text-sm text-muted-foreground">Items Due</p>
        </div>
        </div>
        </CardContent>
        </Card>

        <Card>
        <CardContent className="pt-6">
        <div className="flex items-center gap-4">
        <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950">
        <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
        <p className="text-2xl font-bold">8</p>
        <p className="text-sm text-muted-foreground">Recommendations</p>
        </div>
        </div>
        </CardContent>
        </Card>

        <Card>
        <CardContent className="pt-6">
        <div className="flex items-center gap-4">
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950">
        <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <div>
        <p className="text-2xl font-bold">85%</p>
        <p className="text-sm text-muted-foreground">Avg. Accuracy</p>
        </div>
        </div>
        </CardContent>
        </Card>
        </div>
        </motion.div>

        {/* Main Content Tabs */}
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        >
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
        <TabsTrigger value="due" className="gap-2">
        <Target className="h-4 w-4" />
        Due Items
        </TabsTrigger>
        <TabsTrigger value="recommendations" className="gap-2">
        <Sparkles className="h-4 w-4" />
        Recommendations
        </TabsTrigger>
        </TabsList>

        <TabsContent value="due" className="mt-6">
        <DueItems
        modules="flashcards,quizzes"
        limit={20}
        onStartSession={handleStartDueSession}
        />
        </TabsContent>

        <TabsContent value="recommendations" className="mt-6">
        <Recommendations
        limit={10}
        onStartSession={handleStartRecommendedSession}
        />
        </TabsContent>
        </Tabs>
        </motion.div>
        </div>
    );
}
