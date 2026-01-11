
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  ExternalLink,
  Calendar,
  Link as LinkIcon,
  Share2,
  ScanEye,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { GraphNode, ENTITY_CONFIG } from "../types";

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

  if (!node) return null;

  const config = ENTITY_CONFIG[node.type as string]; // Cast because type could be arbitrary string if unknown
  const Icon = config?.icon || Share2;
  const color = config?.color || "#94a3b8";

  const handleOpen = () => {
    if (config?.path) {
      navigate(`${config.path}/${node.entity_id}`);
    }
  };

  return (
    <div className={`w-80 absolute top-6 right-6 ${className}`}>
      <GlassCard className="p-5 backdrop-blur-3xl bg-black/60 border border-white/10 relative overflow-hidden group">
        {/* Decorative background glow */}
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[80px] opacity-20 pointer-events-none transition-opacity duration-500 group-hover:opacity-30"
          style={{ backgroundColor: color }}
        />

        {/* Header */}
        <div className="flex justify-between items-start mb-6 relative z-10">
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

        {/* Details List */}
        <div className="space-y-4 mb-6 relative z-10 p-4 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>Created recently</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <LinkIcon className="w-4 h-4 text-slate-500" />
            <span>Connected to network</span>
          </div>
        </div>

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
