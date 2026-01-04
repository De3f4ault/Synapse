/**
 * ProgressBar - Quiz Progress Indicator
 *
 * Glowing gradient progress line showing quiz completion.
 */

import React from "react";
import { motion } from "framer-motion";

interface ProgressBarProps {
    current: number;
    total: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
    const percentage = total > 0 ? ((current + 1) / total) * 100 : 0;

    return (
        <div className="h-[2px] w-full bg-white/[0.04] relative">
            <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-purple-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.3 }}
            />
        </div>
    );
};
