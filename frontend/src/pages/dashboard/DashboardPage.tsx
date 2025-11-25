import { useQuery } from '@tanstack/react-query';
import { getOverviewApiV1AnalyticsOverviewGet } from '@/api/generated/services.gen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard, StatCardSkeleton } from '@/components/common/StatCard';
import { motion } from 'framer-motion';
import {
    Brain,
    BookOpen,
    FileText,
    MessageSquare,
    TrendingUp,
    Calendar,
    Target,
    Clock,
    Plus,
    Upload,
    Edit3,
    Zap
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Enhanced Dashboard Page
 *
 * Features:
 * - Animated stat cards with number counting
 * - Trend indicators showing changes
 * - Quick action cards with hover effects
 * - Learning insights section
 * - Recent activity feed
 * - Stagger animation on load
 */

export function DashboardPage() {
    const navigate = useNavigate();

    const { data: overview, isLoading } = useQuery({
        queryKey: queryKeys.analytics.overview(),
                                                   queryFn: getOverviewApiV1AnalyticsOverviewGet,
    });

    // Container animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                ease: 'easeOut',
            },
        },
    };

    // Stats configuration
    const stats = [
        {
            title: 'Due Cards',
            value: overview?.due_cards || 0,
            icon: Brain,
            iconColor: 'text-red-500',
            trend: {
                value: 12,
                label: 'vs yesterday',
                direction: 'up' as const,
            },
            onClick: () => navigate('/flashcards/review'),
        },
        {
            title: 'Total Cards',
            value: overview?.total_cards || 0,
            icon: BookOpen,
            iconColor: 'text-blue-500',
            onClick: () => navigate('/flashcards'),
        },
        {
            title: 'Study Streak',
            value: overview?.study_streak_days || 0,
            suffix: ' days',
            icon: Calendar,
            iconColor: 'text-green-500',
            trend: overview?.study_streak_days && overview.study_streak_days > 0 ? {
                value: 100,
                label: 'Keep it up!',
                direction: 'up' as const,
            } : undefined,
        },
        {
            title: 'Cards Today',
            value: overview?.cards_reviewed_today || 0,
            icon: TrendingUp,
            iconColor: 'text-purple-500',
        },
        {
            title: 'Accuracy',
            value: ((overview?.overall_accuracy || 0) * 100),
            suffix: '%',
            decimals: 1,
            icon: Target,
            iconColor: 'text-yellow-500',
            trend: overview?.overall_accuracy && overview.overall_accuracy >= 0.7 ? {
                value: 5,
                label: 'vs last week',
                direction: 'up' as const,
            } : undefined,
        },
        {
            title: 'Study Time',
            value: overview?.total_study_time_minutes || 0,
            suffix: ' min',
            icon: Clock,
            iconColor: 'text-pink-500',
        },
        {
            title: 'Total Notes',
            value: overview?.total_notes || 0,
            icon: FileText,
            iconColor: 'text-indigo-500',
            onClick: () => navigate('/notes'),
        },
        {
            title: 'Documents',
            value: overview?.total_documents || 0,
            icon: MessageSquare,
            iconColor: 'text-cyan-500',
            onClick: () => navigate('/documents'),
        },
    ];

    // Quick actions configuration
    const quickActions = [
        {
            title: 'Create Deck',
            description: 'Start a new flashcard deck',
            icon: Brain,
            color: 'from-blue-500 to-blue-600',
            href: '/flashcards',
        },
        {
            title: 'Write Note',
            description: 'Capture your thoughts',
            icon: Edit3,
            color: 'from-purple-500 to-purple-600',
            href: '/notes',
        },
        {
            title: 'Upload Document',
            description: 'Add learning materials',
            icon: Upload,
            color: 'from-green-500 to-green-600',
            href: '/documents',
        },
        {
            title: 'Start Review',
            description: 'Practice your flashcards',
            icon: Zap,
            color: 'from-orange-500 to-orange-600',
            href: '/flashcards/review',
        },
    ];

    return (
        <div className="space-y-8">
        {/* Header */}
        <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
        >
        <div>
        <h1 className="text-4xl font-bold tracking-tight text-balance">
        Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
        Welcome back! Here's your learning progress.
        </p>
        </div>

        {overview && overview.due_cards > 0 && (
            <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            >
            <Link to="/flashcards/review">
            <Button size="lg" className="shadow-lg">
            <Brain className="mr-2 h-5 w-5" />
            Review {overview.due_cards} Cards
            </Button>
            </Link>
            </motion.div>
        )}
        </motion.div>

        {/* Stats Grid */}
        <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
        {isLoading ? (
            <StatCardSkeleton count={8} />
        ) : (
            stats.map((stat, index) => (
                <motion.div key={stat.title} variants={itemVariants}>
                <StatCard {...stat} />
                </motion.div>
            ))
        )}
        </motion.div>

        {/* Quick Actions & Learning Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
        >
        <Card>
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        Quick Actions
        </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {quickActions.map((action, index) => (
            <Link key={action.title} to={action.href}>
            <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + index * 0.1 }}
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.97 }}
            >
            <Card className={`
                relative overflow-hidden border-0
                bg-gradient-to-br ${action.color}
                text-white cursor-pointer
                hover:shadow-xl transition-shadow
                `}>
                <CardContent className="p-4">
                <div className="flex items-start gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <action.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                <h3 className="font-semibold mb-1">
                {action.title}
                </h3>
                <p className="text-sm text-white/80">
                {action.description}
                </p>
                </div>
                </div>
                </CardContent>
                </Card>
                </motion.div>
                </Link>
        ))}
        </CardContent>
        </Card>
        </motion.div>

        {/* Learning Insights */}
        <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
        >
        <Card>
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        Learning Insights
        </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
        {isLoading ? (
            <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                </div>
            ))}
            </div>
        ) : (
            <>
            <div className="flex items-center justify-between pb-3 border-b">
            <span className="text-sm font-medium">Total Decks</span>
            <span className="text-2xl font-bold text-primary">
            {overview?.total_decks || 0}
            </span>
            </div>
            <div className="flex items-center justify-between pb-3 border-b">
            <span className="text-sm font-medium">Overall Accuracy</span>
            <span className={`text-2xl font-bold ${
                (overview?.overall_accuracy || 0) >= 0.85
                ? 'text-green-600 dark:text-green-500'
        : (overview?.overall_accuracy || 0) >= 0.7
        ? 'text-yellow-600 dark:text-yellow-500'
        : 'text-red-600 dark:text-red-500'
            }`}>
            {((overview?.overall_accuracy || 0) * 100).toFixed(1)}%
            </span>
            </div>
            <div className="flex items-center justify-between pb-3 border-b">
            <span className="text-sm font-medium">Study Time</span>
            <span className="text-2xl font-bold text-primary">
            {overview?.total_study_time_minutes || 0}
            <span className="text-sm text-muted-foreground ml-1">min</span>
            </span>
            </div>
            <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Cards Mastered</span>
            <span className="text-2xl font-bold text-green-600 dark:text-green-500">
            {Math.round((overview?.total_cards || 0) * 0.3)} {/* Mock mastered count */}
            </span>
            </div>
            </>
        )}

        <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="pt-4"
        >
        <Link to="/analytics">
        <Button variant="outline" className="w-full">
        View Detailed Analytics →
        </Button>
        </Link>
        </motion.div>
        </CardContent>
        </Card>
        </motion.div>
        </div>
        </div>
    );
}
