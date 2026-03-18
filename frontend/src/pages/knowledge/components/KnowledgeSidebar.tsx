import React from "react";
import { Search, Filter, Layers, RefreshCw, Loader2 } from "lucide-react";
import { ENTITY_CONFIG, LINK_COLORS } from "../types";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/shared/ui";
import { GraphAnalyticsPanel } from "./GraphAnalyticsPanel";

interface KnowledgeSidebarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilters: string[];
  onToggleFilter: (type: string) => void;
  activeLinkTypes: string[];
  onToggleLinkType: (type: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  stats?: {
    total_nodes: number;
    total_edges: number;
  };
  className?: string;
  isCollapsed?: boolean;
}

const LINK_TYPE_LABELS: Record<string, string> = {
  manual: "Manual",
  mention: "Mention",
  derived: "Derived",
  semantic: "Semantic",
  suggested: "Suggested",
};

export const KnowledgeSidebar: React.FC<KnowledgeSidebarProps> = ({
  searchQuery,
  onSearchChange,
  activeFilters,
  onToggleFilter,
  activeLinkTypes,
  onToggleLinkType,
  onRefresh,
  isRefreshing = false,
  stats,
  className = "",
  isCollapsed = false,
}) => {
  return (
    <GlassCard
      className={cn(
        "flex h-full w-full flex-col bg-zinc-950/40 backdrop-blur-3xl border-r border-white/10 rounded-none transition-all duration-300 ease-in-out gap-6 p-6",
        className,
      )}
    >
      {/* Header */}
      <div className="flex justify-between items-start shrink-0">
        <div className={cn(isCollapsed ? "hidden" : "block")}>
          <h2 className="text-xl font-bold text-white mb-2 tracking-tight">
            Knowledge Graph
          </h2>
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
            disabled={isRefreshing}
            className={cn(
              "p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5",
              isRefreshing && "opacity-50 cursor-not-allowed",
            )}
            title="Refresh semantic links"
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
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
        {/* Entity Type Filters */}
        {!isCollapsed && (
          <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
            <Filter className="w-3 h-3" />
            <span>Entity Types</span>
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
                  isCollapsed ? "p-2 justify-center" : "",
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
                      isActive
                        ? "bg-white/10"
                        : "bg-white/5 opacity-50 grayscale",
                    )}
                    style={{
                      color: isActive ? config.color : "#64748b",
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {!isCollapsed && (
                    <span
                      className={cn(
                        "text-sm font-medium transition-colors",
                        isActive
                          ? "text-white"
                          : "text-slate-500 group-hover:text-slate-300",
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
                        : "border-slate-700 group-hover:border-slate-500",
                    )}
                  >
                    {isActive && <Layers className="w-3 h-3 text-black" />}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Link Type Legend & Filter */}
        {!isCollapsed && (
          <>
            <div className="flex items-center gap-2 mt-6 mb-4 text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
              <Filter className="w-3 h-3" />
              <span>Link Types</span>
            </div>

            <div className="space-y-1.5">
              {Object.entries(LINK_COLORS).map(([type, color]) => {
                const isActive = activeLinkTypes.includes(type);
                return (
                  <div
                    key={type}
                    onClick={() => onToggleLinkType(type)}
                    className={cn(
                      "group flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-200",
                      isActive
                        ? "hover:bg-white/5"
                        : "opacity-40 hover:opacity-60",
                    )}
                  >
                    {/* Color line indicator */}
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-0.5 rounded-full"
                        style={{
                          backgroundColor: isActive ? color : "#64748b",
                        }}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium transition-colors",
                        isActive
                          ? "text-slate-300"
                          : "text-slate-600 line-through",
                      )}
                    >
                      {LINK_TYPE_LABELS[type] || type}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Graph Analytics */}
        {!isCollapsed && (
          <div className="mt-6 pt-6 border-t border-white/5">
            <GraphAnalyticsPanel />
          </div>
        )}
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
