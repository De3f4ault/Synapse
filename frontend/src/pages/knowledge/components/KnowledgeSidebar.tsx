import React from "react";
import { Search, Filter, Layers, RefreshCw } from "lucide-react";
import { NeumorphicButton, NeumorphicInput } from "@/components/neumorphic";
import { ENTITY_CONFIG } from "../types";

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
}

export const KnowledgeSidebar: React.FC<KnowledgeSidebarProps> = ({
  searchQuery,
  onSearchChange,
  activeFilters,
  onToggleFilter,
  onRefresh,
  stats,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col gap-6 p-6 bg-black/20 backdrop-blur-xl ${className}`}
    >
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Knowledge Graph</h2>
          <div className="flex gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              {stats?.total_nodes || 0} Nodes
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-violet-400" />
              {stats?.total_edges || 0} Links
            </span>
          </div>
        </div>
        {onRefresh && (
          <NeumorphicButton variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4" />
          </NeumorphicButton>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <NeumorphicInput
          icon={Search}
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Filters */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-2 mb-4 text-sm text-slate-400 font-semibold">
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </div>

        <div className="space-y-3">
          {Object.entries(ENTITY_CONFIG).map(([type, config]) => {
            const isActive = activeFilters.includes(type);
            const Icon = config.icon;

            return (
              <div
                key={type}
                onClick={() => onToggleFilter(type)}
                className={`
                                    group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200
                                    ${
                                      isActive
                                        ? "bg-slate-800/50 shadow-[inset_-2px_-2px_6px_rgba(255,255,255,0.05),inset_2px_2px_6px_rgba(0,0,0,0.5)]"
                                        : "hover:bg-slate-800/30"
                                    }
                                `}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200
                                            ${isActive ? "" : "opacity-50 grayscale"}
                                        `}
                    style={{
                      backgroundColor: isActive
                        ? `${config.color}20`
                        : undefined,
                      border: isActive
                        ? `1px solid ${config.color}40`
                        : "1px solid transparent",
                    }}
                  >
                    <Icon
                      className="w-4 h-4"
                      style={{ color: isActive ? config.color : "#64748b" }}
                    />
                  </div>
                  <span
                    className={`text-sm font-medium transition-colors ${isActive ? "text-slate-200" : "text-slate-500"}`}
                  >
                    {config.label}
                  </span>
                </div>
                <div
                  className={`
                                    w-4 h-4 rounded border flex items-center justify-center transition-all duration-200
                                    ${
                                      isActive
                                        ? "bg-cyan-500 border-cyan-500"
                                        : "border-slate-600 group-hover:border-slate-500"
                                    }
                                `}
                >
                  {isActive && <Layers className="w-3 h-3 text-white" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hint */}
      <div className="p-4 rounded-xl bg-slate-800/30 border border-white/5">
        <p className="text-xs text-slate-400 leading-relaxed text-center">
          Use{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 font-mono">
            Shift
          </kbd>{" "}
          + Drag to select multiple nodes, or Double Click to navigate to a
          specific item.
        </p>
      </div>
    </div>
  );
};
