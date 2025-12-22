import { motion } from "framer-motion";
import { Layout, Network, Target, BarChart2, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { QuickActions } from "./QuickActions";

interface CommandDeckProps {
  activeView?: string;
  onViewChange?: (view: string) => void;
}

/**
 * CommandDeck (Exported as DashboardHeader)
 *
 * FINAL FIX:
 * - Acts purely as the FOOTER.
 * - Positioned `fixed bottom-8` with high Z-index.
 * - Contains QuickActions inside the pill.
 */
export function DashboardHeader({
  activeView = "tactical",
  onViewChange,
}: CommandDeckProps) {
  const [current, setCurrent] = useState(activeView);

  const handleViewChange = (id: string) => {
    setCurrent(id);
    onViewChange?.(id);
  };

  const navItems = [
    { id: "tactical", icon: Layout, label: "Deck" },
    { id: "nexus", icon: Network, label: "Map" },
    { id: "flow", icon: Target, label: "Flow" },
    { id: "analytics", icon: BarChart2, label: "Data" },
  ];

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-4 pointer-events-none">
      {/* The Control Pill - pointer-events-auto allows click-through */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-full bg-[#0F0F0F]/90 backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)]"
      >
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleViewChange(item.id)}
            className={cn(
              "relative px-5 py-2.5 rounded-full flex items-center gap-2 transition-all duration-300 z-10",
              current === item.id
                ? "text-black"
                : "text-slate-500 hover:text-white",
            )}
          >
            {current === item.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-white rounded-full -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <item.icon
              className={cn(
                "w-4 h-4",
                current === item.id ? "stroke-[2.5px]" : "stroke-[1.5px]",
              )}
            />
            {current === item.id && (
              <motion.span
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs font-bold tracking-wide"
              >
                {item.label}
              </motion.span>
            )}
          </button>
        ))}

        <div className="w-px h-6 bg-white/10 mx-2" />

        {/* Quick Actions Integration */}
        <div className="relative z-10">
          <QuickActions />
        </div>

        <div className="w-px h-6 bg-white/10 mx-2" />

        <button className="p-2.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors relative z-10">
          <Maximize2 className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
}
