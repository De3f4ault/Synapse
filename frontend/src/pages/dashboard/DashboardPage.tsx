import React from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import { StatusCard } from './components/widgets/StatusCard';
import { ActivityGraph } from './components/widgets/ActivityGraph';
import { WeakAreasWidget } from './components/widgets/WeakAreasWidget';
import { MasteryWidget } from './components/widgets/MasteryWidget';
import { RecentFilesWidget } from './components/widgets/RecentFilesWidget';
import { DashboardAssistant } from './components/widgets/DashboardAssistant';
import {
    Layers,
    MessageSquare,
    Zap,
    Clock,
    Target,
    Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export const DashboardPage: React.FC = () => {
    const { data, isLoading, error } = useDashboardData();
    const navigate = useNavigate();

    // Date formatter for the header
    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    if (error) {
        return (
            <div className="p-8 text-center min-h-screen flex items-center justify-center">
                <div>
                    <h2 className="text-xl font-bold text-red-500">System Offline</h2>
                    <p className="text-muted-foreground">Unable to establish connection to command center.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen overflow-y-auto scrollbar-hide bg-transparent p-6 space-y-6 relative pb-24">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
                    <p className="text-muted-foreground">{today}</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => navigate('/flashcards/review')}>
                        <Zap className="mr-2 h-4 w-4" />
                        Start Review
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/chat')}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        AI Chat
                    </Button>
                </div>
            </div>

            {/* Top Stats Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {isLoading ? (
                    Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-[120px] w-full" />)
                ) : (
                    <>
                        <StatusCard
                            title="Due Cards"
                            value={data?.dueCards?.length || 0}
                            subtitle="Ready for review"
                            icon={Layers}
                            trend={data?.dueCards?.length ? 'up' : 'neutral'}
                            className="border-l-4 border-l-primary"
                            onClick={() => navigate('/flashcards')}
                        />
                        <StatusCard
                            title="Accuracy"
                            value={`${(data?.overview?.overall_accuracy || 0).toFixed(1)}%`}
                            subtitle="Last 30 days"
                            icon={Target}
                            trend={(data?.overview?.overall_accuracy || 0) > 80 ? 'up' : 'neutral'}
                            trendValue="+2.5%"
                        />
                        <StatusCard
                            title="Study Streak"
                            value={`${data?.overview?.study_streak_days || 0} days`}
                            subtitle="Keep it up!"
                            icon={Activity}
                            trend="up"
                        />
                        <StatusCard
                            title="Total Time"
                            value={`${Math.floor((data?.overview?.total_study_time_minutes || 0) / 60)}h`}
                            subtitle="Focused learning"
                            icon={Clock}
                        />
                    </>
                )}
            </div>

            {/* Main Bento Grid */}
            <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-4">

                {/* Row 1: Graph + Mastery */}
                <div className="col-span-4 lg:col-span-3">
                    <ActivityGraph
                        data={data?.performance || []}
                        isLoading={isLoading}
                    />
                </div>

                <div className="col-span-4 lg:col-span-1">
                    <MasteryWidget data={data?.topicMastery || []} />
                </div>

                {/* Row 2: Weak Areas + Recents */}
                <div className="col-span-4 lg:col-span-2">
                    <WeakAreasWidget data={data?.weakAreas || []} />
                </div>
                <div className="col-span-4 lg:col-span-2">
                    <RecentFilesWidget
                        documents={data?.documents || []}
                        notes={data?.notes || []}
                    />
                </div>
            </div>

            {/* Dashboard Assistant - Always monitoring */}
            <DashboardAssistant />
        </div>
    );
};

export default DashboardPage;
