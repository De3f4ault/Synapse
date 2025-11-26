import { motion } from 'framer-motion';
import type { DashboardData } from '../../types/dashboard.types';
import { IntelligencePanel } from './IntelligencePanel';
import { KnowledgeGraph } from './KnowledgeGraph';
import { FocusQueue } from './FocusQueue';
import { TotalReviewsCard, AccuracyCard, StudyTimeCard, StreakCard } from '../shared/StatCard';
import { NotesCreatedCard, ChatSessionsCard } from '../shared/CustomStats';

interface DashboardContainerProps {
    data: DashboardData | undefined;
}

export function DashboardContainer({ data }: DashboardContainerProps) {
    const overview = data?.overview;

    return (
        <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex-1 overflow-hidden flex flex-col"
        >
        {/* ============================================
            NEW: Stats Grid (Full Width Above Layout)
    ============================================ */}
    <div className="px-4 pt-4 pb-2">
    <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3"
    >
    <TotalReviewsCard
    value={overview?.total_reviews || 0}
    trend={{ value: 12.5, label: 'vs last week' }}
    />
    <AccuracyCard
    value={overview?.average_accuracy || 0}
    trend={{ value: -2.3, label: 'vs last week' }}
    />
    <StudyTimeCard
    value={overview?.total_study_time || 0}
    trend={{ value: 8.1, label: 'vs last week' }}
    />
    <StreakCard
    value={overview?.current_streak || 0}
    />
    <NotesCreatedCard value={data?.notes.length || 0} /> {/* NEW */}
    <ChatSessionsCard value={data?.chatSessions.length || 0} /> {/* NEW */}
    </motion.div>
    </div>

    {/* ============================================
        EXISTING: Three-Column Layout
        ============================================ */}
        {/* Desktop: 3 columns */}
        <div className="hidden lg:grid lg:grid-cols-[1fr_2fr_1fr] flex-1 gap-4 px-4 pb-4">
        <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="overflow-hidden rounded-xl border bg-card shadow-sm"
        >
        <IntelligencePanel data={data} />
        </motion.div>

        <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="overflow-hidden"
        >
        <KnowledgeGraph data={data} />
        </motion.div>

        <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="overflow-hidden rounded-xl border bg-card shadow-sm"
        >
        <FocusQueue data={data} />
        </motion.div>
        </div>

        {/* Tablet: 2 columns (Graph + Queue) */}
        <div className="hidden md:grid lg:hidden md:grid-cols-[1.5fr_1fr] flex-1 gap-4 px-4 pb-4">
        <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="overflow-hidden"
        >
        <KnowledgeGraph data={data} />
        </motion.div>

        <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="overflow-hidden rounded-xl border bg-card shadow-sm"
        >
        <FocusQueue data={data} />
        </motion.div>
        </div>

        {/* Mobile: Stacked */}
        <div className="md:hidden flex flex-col flex-1 gap-4 px-4 pb-4 overflow-y-auto">
        <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="min-h-[400px] rounded-xl border bg-card shadow-sm"
        >
        <IntelligencePanel data={data} />
        </motion.div>

        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="min-h-[400px] rounded-xl border bg-card shadow-sm"
        >
        <FocusQueue data={data} />
        </motion.div>

        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="min-h-[500px]"
        >
        <KnowledgeGraph data={data} />
        </motion.div>
        </div>
        </motion.div>
    );
}
