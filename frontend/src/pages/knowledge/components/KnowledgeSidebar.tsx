import React from "react";
import { Search, Filter, Layers, RefreshCw } from "lucide-react";
import { ENTITY_CONFIG } from "../types";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/shared/ui";

interface KnowledgeSidebarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilters: string[];
  onToggleFilter: (type: string) => void;
  onRefresh?: () => void;
  stats?: {
    total_nodes: number;
    total_edges: number;
  };
  className?: string;
  isCollapsed?: boolean;
}

export const KnowledgeSidebar: React.FC<KnowledgeSidebarProps> = ({
  searchQuery,
  onSearchChange,
  activeFilters,
  onToggleFilter,
  onRefresh,
  stats,
  className = "",
  isCollapsed = false
}) => {
  return (
    <GlassCard
      className={cn(
        "flex h-full w-full flex-col bg-zinc-950/40 backdrop-blur-3xl border-r border-white/10 rounded-none transition-all duration-300 ease-in-out gap-6 p-6",
        className
      )}
    >
      {/* Header */}
      <div className="flex justify-between items-start shrink-0">
        <div className={cn(isCollapsed ? "hidden" : "block")}>
          <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Knowledge Graph</h2>
          <div className="flex gap-4 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
              {stats?.total_nodes || 0} Nodes
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.5)]" />
              {stats?.total_edges || 0} Links
            </span>
          </div>
        </div>
        {onRefresh && !isCollapsed && (
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search */}
      {!isCollapsed && (
        <div className="relative group shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search nodes..."
            className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:bg-black/40 transition-all placeholder:text-slate-600"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {!isCollapsed && (
          <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
            <Filter className="w-3 h-3" />
            <span>Filters</span>
          </div>
        )}

        <div className="space-y-2">
          {Object.entries(ENTITY_CONFIG).map(([type, config]) => {
            const isActive = activeFilters.includes(type);
            const Icon = config.icon;

            return (
              <div
                key={type}
                onClick={() => onToggleFilter(type)}
                title={isCollapsed ? config.label : undefined}
                className={cn(
                  "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 border",
                  isActive
                    ? "bg-white/5 border-white/10"
                    : "hover:bg-white/[0.02] border-transparent",
                  isCollapsed ? "p-2 justify-center" : ""
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
                      isActive ? "bg-white/10" : "bg-white/5 opacity-50 grayscale"
                    )}
                    style={{
                      color: isActive ? config.color : "#64748b"
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {!isCollapsed && (
                    <span
                      className={cn(
                        "text-sm font-medium transition-colors",
                        isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"
                      )}
                    >
                      {config.label}
                    </span>
                  )}
                </div>

                {!isCollapsed && (
                  <div
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-all duration-200",
                      isActive
                        ? "bg-cyan-500 border-cyan-500"
                        : "border-slate-700 group-hover:border-slate-500"
                    )}
                  >
                    {isActive && <Layers className="w-3 h-3 text-black" />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hint */}
      {!isCollapsed && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/5 shrink-0">
          <p className="text-xs text-slate-400 leading-relaxed text-center">
            Use{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-slate-200 font-mono text-[10px]">
              Shift + Drag
            </kbd>{" "}
            to select multiple nodes.
          </p>
        </div>
      )}
    </GlassCard>
  );
};
