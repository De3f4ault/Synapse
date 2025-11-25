import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    getOverviewApiV1AnalyticsOverviewGet,
    getPerformanceApiV1AnalyticsPerformanceGet,
    getWeakAreasApiV1AnalyticsWeakAreasGet,
} from '@/api/generated/services.gen';
import { queryKeys } from '@/lib/queryKeys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import {
    TrendingUp,
    Target,
    Calendar,
    Award,
    AlertTriangle,
    Activity,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { WeakArea } from '@/api/generated/types.gen';

/**
 * Enhanced Analytics Page
 *
 * Features:
 * - Performance trends (line chart)
 * - Study time by day (bar chart)
 * - Mastery distribution (pie chart)
 * - Weak areas identification
 * - Date range filtering
 * - Activity heatmap (mock)
 */

type DateRange = '7' | '30' | '90' | '365';

export function AnalyticsPage() {
    const [dateRange, setDateRange] = useState<DateRange>('30');

    // Fetch overview
    const { data: overview, isLoading: overviewLoading } = useQuery({
        queryKey: queryKeys.analytics.overview(),
                                                                    queryFn: getOverviewApiV1AnalyticsOverviewGet,
    });

    // Fetch performance trends
    const { isLoading: trendsLoading } = useQuery({
        queryKey: queryKeys.analytics.performance(parseInt(dateRange)),
                                                  queryFn: () =>
                                                  getPerformanceApiV1AnalyticsPerformanceGet({
                                                      days: parseInt(dateRange),
                                                  }),
    });

    // Fetch weak areas
    const { data: weakAreas, isLoading: weakAreasLoading } = useQuery({
        queryKey: queryKeys.analytics.weakAreas(),
                                                                      queryFn: () => getWeakAreasApiV1AnalyticsWeakAreasGet({}),
    });

    // Mock data for charts (replace with real data)
    const studyTimeData = [
        { day: 'Mon', minutes: 45 },
        { day: 'Tue', minutes: 30 },
        { day: 'Wed', minutes: 60 },
        { day: 'Thu', minutes: 40 },
        { day: 'Fri', minutes: 55 },
        { day: 'Sat', minutes: 70 },
        { day: 'Sun', minutes: 50 },
    ];

    const masteryData = [
        { name: 'Mastered', value: 30, color: '#10b981' },
        { name: 'Review', value: 25, color: '#f59e0b' },
        { name: 'Learning', value: 35, color: '#3b82f6' },
        { name: 'New', value: 10, color: '#a855f7' },
    ];

    const accuracyTrendData = [
        { date: 'Week 1', accuracy: 65 },
        { date: 'Week 2', accuracy: 70 },
        { date: 'Week 3', accuracy: 75 },
        { date: 'Week 4', accuracy: 82 },
    ];

    return (
        <div className="space-y-6">
        {/* Header */}
        <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
        >
        <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">
        Track your learning progress and performance
        </p>
        </div>

        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
        <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
        <SelectItem value="7">Last 7 days</SelectItem>
        <SelectItem value="30">Last 30 days</SelectItem>
        <SelectItem value="90">Last 90 days</SelectItem>
        <SelectItem value="365">All time</SelectItem>
        </SelectContent>
        </Select>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
            {
                label: 'Total Cards',
                value: overview?.total_cards || 0,
                icon: Target,
                color: 'text-blue-500',
            },
            {
                label: 'Accuracy',
                value: `${((overview?.overall_accuracy || 0) * 100).toFixed(1)}%`,
            icon: TrendingUp,
            color: 'text-green-500',
            },
            {
                label: 'Study Streak',
                value: `${overview?.study_streak_days || 0} days`,
                icon: Calendar,
                color: 'text-orange-500',
            },
            {
                label: 'Total Time',
                value: `${overview?.total_study_time_minutes || 0} min`,
                icon: Activity,
                color: 'text-purple-500',
            },
        ].map((metric, index) => (
            <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            >
            <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
            <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
            <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
            <p className="text-2xl font-bold">{metric.value}</p>
            </CardContent>
            </Card>
            </motion.div>
        ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="weak-areas">Weak Areas</TabsTrigger>
        <TabsTrigger value="heatmap">Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Accuracy Trend */}
        <Card>
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5" />
        Accuracy Trend
        </CardTitle>
        </CardHeader>
        <CardContent>
        {trendsLoading ? (
            <Skeleton className="h-64 w-full" />
        ) : (
            <ResponsiveContainer width="100%" height={250}>
            <LineChart data={accuracyTrendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Line
            type="monotone"
            dataKey="accuracy"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 4 }}
            animationDuration={1000}
            />
            </LineChart>
            </ResponsiveContainer>
        )}
        </CardContent>
        </Card>

        {/* Study Time */}
        <Card>
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
        <Activity className="h-5 w-5" />
        Study Time by Day
        </CardTitle>
        </CardHeader>
        <CardContent>
        <ResponsiveContainer width="100%" height={250}>
        <BarChart data={studyTimeData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="day" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar
        dataKey="minutes"
        fill="#3b82f6"
        radius={[8, 8, 0, 0]}
        animationDuration={800}
        />
        </BarChart>
        </ResponsiveContainer>
        </CardContent>
        </Card>
        </div>

        {/* Mastery Distribution */}
        <Card>
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
        <Target className="h-5 w-5" />
        Mastery Distribution
        </CardTitle>
        </CardHeader>
        <CardContent>
        <div className="flex items-center justify-center">
        <ResponsiveContainer width="100%" height={300}>
        <PieChart>
        <Pie
        data={masteryData}
        cx="50%"
        cy="50%"
        labelLine={false}
        label={(entry) => `${entry.name}: ${entry.value}%`}
        outerRadius={100}
        fill="#8884d8"
        dataKey="value"
        animationDuration={1000}
        >
        {masteryData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
        </Pie>
        <Tooltip />
        <Legend />
        </PieChart>
        </ResponsiveContainer>
        </div>
        </CardContent>
        </Card>
        </TabsContent>

        {/* Weak Areas Tab */}
        <TabsContent value="weak-areas">
        <Card>
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-orange-500" />
        Areas Needing Attention
        </CardTitle>
        </CardHeader>
        <CardContent>
        {weakAreasLoading ? (
            <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
            ))}
            </div>
        ) : !weakAreas || weakAreas.length === 0 ? (
            <div className="text-center py-8">
            <Award className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <p className="text-muted-foreground">
            Great job! No weak areas detected.
            </p>
            </div>
        ) : (
            <div className="space-y-3">
            {weakAreas.map((area: WeakArea, index: number) => (
                <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 rounded-lg border"
                >
                <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold">{area.topic}</h4>
                <Badge
                variant="outline"
                className={
                    area.accuracy < 0.5
                    ? 'bg-red-50 text-red-700'
            : area.accuracy < 0.7
            ? 'bg-orange-50 text-orange-700'
            : 'bg-yellow-50 text-yellow-700'
                }
                >
                {(area.accuracy * 100).toFixed(0)}% accuracy
                </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                {area.review_count} reviews
                </p>
                </div>
                <Button variant="outline" size="sm">
                Focus Study
                </Button>
                </motion.div>
            ))}
            </div>
        )}
        </CardContent>
        </Card>
        </TabsContent>

        {/* Heatmap Tab */}
        <TabsContent value="heatmap">
        <Card>
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
        <Calendar className="h-5 w-5" />
        Activity Heatmap
        </CardTitle>
        </CardHeader>
        <CardContent>
        <div className="text-center py-12">
        <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
        Activity heatmap coming soon...
        </p>
        <p className="text-sm text-muted-foreground mt-2">
        This will show your daily study activity over the past year
        </p>
        </div>
        </CardContent>
        </Card>
        </TabsContent>
        </Tabs>
        </div>
    );
}
