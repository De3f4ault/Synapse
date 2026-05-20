import React from "react";
import { Search, Filter, Layers, RefreshCw, Loader2, Network } from "lucide-react";
import { ENTITY_CONFIG, LINK_COLORS } from "../types";
import { cn } from "@/lib/utils";
import { SidebarShell } from "@/shared/ui";
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
}) => {
  return (
    <SidebarShell
      storageKey="knowledgeSidebarCollapsed"
      title="Knowledge Graph"
      titleIcon={Network}
      primaryAction={{
        label: "Refresh Links",
        icon: isRefreshing ? Loader2 : RefreshCw,
        onClick: () => onRefresh?.(),
      }}
      searchable
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search nodes..."
      statsLine={
        <>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" />
            {stats?.total_nodes || 0} Nodes
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent" />
            {stats?.total_edges || 0} Links
          </span>
        </>
      }
      footerHint="Use Shift + Drag to select multiple nodes."
      className={className}
    >
      {(isCollapsed) => (
        <>
          {/* Entity Type Filters */}
          {!isCollapsed && (
            <div className="flex items-center gap-2 mb-4 text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">
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
                  className={cn(
                    "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 border",
                    isActive
                      ? "bg-muted border-border"
                      : "hover:bg-muted/50 border-transparent",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
                        isActive
                          ? "bg-foreground/10"
                          : "bg-foreground/5 opacity-50 grayscale",
                      )}
                      style={{
                        color: isActive ? config.color : undefined,
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    {!isCollapsed && (
                      <span
                        className={cn(
                          "text-sm font-medium transition-colors",
                          isActive
                            ? "text-foreground"
                            : "text-muted-foreground group-hover:text-foreground/80",
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
                          ? "bg-primary border-primary"
                          : "border-border group-hover:border-border",
                      )}
                    >
                      {isActive && <Layers className="w-3 h-3 text-primary-foreground" />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Link Type Legend & Filter */}
          {!isCollapsed && (
            <>
              <div className="flex items-center gap-2 mt-6 mb-4 text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">
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
                          ? "hover:bg-muted/50"
                          : "opacity-40 hover:opacity-60",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-0.5 rounded-full"
                          style={{
                            backgroundColor: isActive ? color : undefined,
                          }}
                        />
                      </div>
                      <span
                        className={cn(
                          "text-xs font-medium transition-colors",
                          isActive
                            ? "text-foreground/80"
                            : "text-muted-foreground line-through",
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
            <div className="mt-6 pt-6 border-t border-border">
              <GraphAnalyticsPanel />
            </div>
          )}
        </>
      )}
    </SidebarShell>
  );
};
