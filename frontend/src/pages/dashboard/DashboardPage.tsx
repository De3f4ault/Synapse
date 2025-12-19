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
import { NeumorphicButton, NeumorphicCard } from '@/components/neumorphic';
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
            <div className="relative min-h-screen nm-bg nm-constellation-bg flex items-center justify-center">
                <NeumorphicCard className="p-8 text-center max-w-md flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full nm-inset flex items-center justify-center mb-4 text-red-400">
                        <Zap className="h-8 w-8" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">System Offline</h2>
                    <p className="text-slate-400">Unable to establish connection to command center.</p>
                </NeumorphicCard>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen nm-bg nm-constellation-bg overflow-hidden flex flex-col">
            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-8 pb-32 space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white shadow-cyan-500/20 drop-shadow-sm">Command Center</h1>
                        <p className="text-slate-400 font-mono text-sm tracking-wider uppercase">{today}</p>
                    </div>
                    <div className="flex gap-3">
                        <NeumorphicButton
                            variant="primary"
                            onClick={() => navigate('/flashcards/review')}
                            className="text-white"
                        >
                            <Zap className="mr-2 h-4 w-4" />
                            Start Review
                        </NeumorphicButton>
                        <NeumorphicButton
                            variant="ghost"
                            onClick={() => navigate('/chat')}
                        >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            AI Chat
                        </NeumorphicButton>
                    </div>
                </div>

                {/* Top Stats Row */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {isLoading ? (
                        Array(4).fill(0).map((_, i) => (
                            <div key={i} className="h-32 rounded-xl bg-white/5 border border-white/5 animate-pulse" />
                        ))
                    ) : (
                        <>
                            <StatusCard
                                title="Due Cards"
                                value={data?.dueCards?.length || 0}
                                subtitle="Ready for review"
                                icon={Layers}
                                trend={data?.dueCards?.length ? 'up' : 'neutral'}
                                onClick={() => navigate('/flashcards')}
                                color="cyan"
                            />
                            <StatusCard
                                title="Accuracy"
                                value={`${(data?.overview?.overall_accuracy || 0).toFixed(1)}%`}
                                subtitle="Last 30 days"
                                icon={Target}
                                trend={(data?.overview?.overall_accuracy || 0) > 80 ? 'up' : 'neutral'}
                                trendValue="+2.5%"
                                color="purple"
                            />
                            <StatusCard
                                title="Study Streak"
                                value={`${data?.overview?.study_streak_days || 0} days`}
                                subtitle="Keep it up!"
                                icon={Activity}
                                trend="up"
                                color="emerald"
                            />
                            <StatusCard
                                title="Total Time"
                                value={`${Math.floor((data?.overview?.total_study_time_minutes || 0) / 60)}h`}
                                subtitle="Focused learning"
                                icon={Clock}
                                color="amber"
                            />
                        </>
                    )}
                </div>

                {/* Main Bento Grid */}
                <div className="grid gap-6 md:grid-cols-4 lg:grid-cols-4">

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
            </div>

            {/* Dashboard Assistant - Always monitoring */}
            <DashboardAssistant />
        </div>
    );
};

export default DashboardPage;
