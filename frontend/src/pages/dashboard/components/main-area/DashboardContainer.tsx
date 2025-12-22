/**
 * DashboardContainer - Final Integrated Layout
 * This file is REPLACED with tab-based layout in DashboardPage.tsx
 * Keeping for reference/backward compatibility
 */

import { motion } from "framer-motion";
import { IntelligencePanel } from "./IntelligencePanel";
import { FocusQueue } from "../priority/FocusQueue";
import { LearningPath } from "../pathways/LearningPath";
import type { DashboardData } from "../../types/dashboard.types";

interface DashboardContainerProps {
  data: DashboardData | undefined;
}

/**
 * Legacy 3-column layout (Desktop view)
 * NOTE: New implementation uses tabbed layout in DashboardPage.tsx
 */
export function DashboardContainer({ data }: DashboardContainerProps) {
  return (
    <div className="w-full h-full flex flex-col p-6 pb-32">
      {/* Desktop: 3 columns (Intelligence | Pathways | Queue) */}
      <div className="hidden lg:grid lg:grid-cols-[20rem_1fr_20rem] flex-1 gap-6 overflow-hidden min-h-0 pointer-events-auto">
        {/* Left: Intelligence Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="h-full overflow-y-auto custom-scrollbar"
        >
          <IntelligencePanel data={data} />
        </motion.div>

        {/* Center: Learning Pathways */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="h-full overflow-y-auto custom-scrollbar"
        >
          <LearningPath data={data} />
        </motion.div>

        {/* Right: Focus Queue */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="h-full overflow-y-auto custom-scrollbar"
        >
          <FocusQueue data={data} />
        </motion.div>
      </div>

      {/* Tablet: 2 columns */}
      <div className="hidden md:grid lg:hidden md:grid-cols-[1.5fr_1fr] flex-1 gap-4 overflow-hidden min-h-0 pointer-events-auto">
        <motion.div className="h-full overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <IntelligencePanel data={data} />
            <LearningPath data={data} />
          </div>
        </motion.div>
        <motion.div className="h-full overflow-y-auto custom-scrollbar">
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
          <LearningPath data={data} />
        </div>
      </div>
    </div>
  );
}
