import { motion } from 'framer-motion';
import type { DashboardData } from '../../types/dashboard.types';
import { IntelligencePanel } from './IntelligencePanel';
import { KnowledgeGraph } from './KnowledgeGraph';
import { FocusQueue } from './FocusQueue';

interface DashboardContainerProps {
    data: DashboardData | undefined;
}

/**
 * DashboardContainer - Layout Engine
 * * FIX:
 * - REMOVED the "Stats Grid" section entirely.
 * - Added `pb-32` bottom padding so the Knowledge Graph/Queues don't get hidden behind the new Footer.
 * - Uses strict 3-column grid for Desktop.
 */
export function DashboardContainer({ data }: DashboardContainerProps) {
    return (
        <div className="w-full h-full flex flex-col p-6 pb-32">

        {/* Desktop: 3 columns (Intelligence | Nexus | Queue) */}
        <div className="hidden lg:grid lg:grid-cols-[20rem_1fr_20rem] flex-1 gap-6 overflow-hidden min-h-0 pointer-events-auto">
        {/* Left: Intelligence (Cortex Feed) */}
        <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="h-full overflow-hidden"
        >
        <IntelligencePanel data={data} />
        </motion.div>

        {/* Center: Neural Nexus (Graph) */}
        <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="h-full overflow-hidden"
        >
        <KnowledgeGraph data={data} />
        </motion.div>

        {/* Right: Mission Log (Queue) */}
        <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="h-full overflow-hidden"
        >
        <FocusQueue data={data} />
        </motion.div>
        </div>

        {/* Tablet: 2 columns */}
        <div className="hidden md:grid lg:hidden md:grid-cols-[1.5fr_1fr] flex-1 gap-4 overflow-hidden min-h-0 pointer-events-auto">
        <motion.div className="h-full overflow-hidden">
        <KnowledgeGraph data={data} />
        </motion.div>
        <motion.div className="h-full overflow-hidden">
        <FocusQueue data={data} />
        </motion.div>
        </div>

        {/* Mobile: Stacked with Scroll */}
        <div className="md:hidden flex flex-col flex-1 gap-4 overflow-y-auto custom-scrollbar pointer-events-auto">
        <div className="min-h-[400px] shrink-0">
        <IntelligencePanel data={data} />
        </div>
        <div className="min-h-[400px] shrink-0">
        <FocusQueue data={data} />
        </div>
        <div className="min-h-[500px] shrink-0">
        <KnowledgeGraph data={data} />
        </div>
        </div>
        </div>
    );
}
