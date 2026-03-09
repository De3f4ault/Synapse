
import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  ExternalLink,
  Link as LinkIcon,
  Share2,
  ScanEye,
  Zap,
  ArrowRight,
} from "lucide-react";
import { GlassCard } from "@/shared/ui";
import { GraphNode, ENTITY_CONFIG, LINK_COLORS } from "../types";
import { LinksService, LinkEntityType } from "@/api/generated";

interface NodeDetailsPanelProps {
  node: GraphNode | null;
  onClose: () => void;
  className?: string;
}

export const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({
  node,
  onClose,
  className = "",
}) => {
  const navigate = useNavigate();

  // Fetch real link data for this node
  const { data: linksData } = useQuery({
    queryKey: ["entity-links", node?.type, node?.entity_id],
    queryFn: () =>
      LinksService.getEntityLinksApiV1LinksEntityEntityTypeEntityIdGet(
        node!.type as LinkEntityType,
        node!.entity_id,
      ),
    enabled: !!node,
    staleTime: 30_000,
  });

  if (!node) return null;

  const config = ENTITY_CONFIG[node.type as string];
  const Icon = config?.icon || Share2;
  const color = config?.color || "#94a3b8";

  const handleOpen = () => {
    if (config?.path) {
      navigate(`${config.path}/${node.entity_id}`);
    }
  };

  // Compute connection stats from real data
  const outgoing = linksData?.outgoing ?? [];
  const backlinks = linksData?.backlinks ?? [];
  const allLinks = [...outgoing, ...backlinks];
  const totalConnections = allLinks.length;

  // Distinct link types
  const linkTypes = [...new Set(allLinks.map((l) => l.link_type))];

  // Strongest connection
  const strongest = allLinks.length
    ? allLinks.reduce((a, b) => (a.strength > b.strength ? a : b))
    : null;

  // Top related entities (by strength, deduplicated)
  const relatedEntities = allLinks
    .map((l) => ({
      type:
        l.source_type === node.type && l.source_id === node.entity_id
          ? l.target_type
          : l.source_type,
      id:
        l.source_type === node.type && l.source_id === node.entity_id
          ? l.target_id
          : l.source_id,
      linkType: l.link_type,
      strength: l.strength,
    }))
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5);

  return (
    <div className={`w-80 absolute top-6 right-6 ${className}`}>
      <GlassCard className="p-5 backdrop-blur-3xl bg-black/60 border border-white/10 relative overflow-hidden group">
        {/* Decorative background glow */}
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[80px] opacity-20 pointer-events-none transition-opacity duration-500 group-hover:opacity-30"
          style={{ backgroundColor: color }}
        />

        {/* Header */}
        <div className="flex justify-between items-start mb-5 relative z-10">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ring-1 ring-white/10"
              style={{ backgroundColor: `${color}20`, color: color }}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight line-clamp-2">
                {node.label || `${config?.label || "Node"} ${node.entity_id}`}
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">
                {node.type}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Connection Stats */}
        <div className="space-y-3 mb-5 relative z-10 p-4 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-300">
              <LinkIcon className="w-4 h-4 text-slate-500" />
              <span>Connections</span>
            </div>
            <span className="font-mono text-white font-bold">
              {totalConnections}
            </span>
          </div>

          {linkTypes.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-300">
                <Share2 className="w-4 h-4 text-slate-500" />
                <span>Link Types</span>
              </div>
              <div className="flex gap-1.5">
                {linkTypes.map((lt) => (
                  <span
                    key={lt}
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${LINK_COLORS[lt] || "#64748b"}20`,
                      color: LINK_COLORS[lt] || "#64748b",
                    }}
                  >
                    {lt}
                  </span>
                ))}
              </div>
            </div>
          )}

          {strongest && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-300">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Strongest</span>
              </div>
              <span className="font-mono text-emerald-400 font-bold">
                {Math.round(strongest.strength * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Related Entities */}
        {relatedEntities.length > 0 && (
          <div className="mb-5 relative z-10">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">
              Related
            </h4>
            <div className="space-y-1.5">
              {relatedEntities.map((rel, i) => {
                const relConfig = ENTITY_CONFIG[rel.type];
                const RelIcon = relConfig?.icon || Share2;
                return (
                  <div
                    key={`${rel.type}-${rel.id}-${i}`}
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group/rel"
                    onClick={() => {
                      if (relConfig?.path) {
                        navigate(`${relConfig.path}/${rel.id}`);
                      }
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center"
                      style={{
                        backgroundColor: `${relConfig?.color || "#64748b"}15`,
                        color: relConfig?.color || "#64748b",
                      }}
                    >
                      <RelIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-slate-300 group-hover/rel:text-white transition-colors">
                        {relConfig?.label || rel.type} #{rel.id}
                      </span>
                    </div>
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                      style={{
                        color: LINK_COLORS[rel.linkType] || "#64748b",
                        backgroundColor: `${LINK_COLORS[rel.linkType] || "#64748b"}15`,
                      }}
                    >
                      {rel.linkType}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-600 opacity-0 group-hover/rel:opacity-100 transition-opacity" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 relative z-10">
          <button
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm transition-all shadow-lg shadow-cyan-500/20"
            onClick={handleOpen}
          >
            <span>Open</span>
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-sm transition-colors flex items-center gap-2"
            onClick={() => {
              console.log("Focus on node", node.id);
            }}
          >
            <ScanEye className="w-4 h-4" />
          </button>
        </div>
      </GlassCard>
    </div>
  );
};
