import React from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  ExternalLink,
  Calendar,
  Link as LinkIcon,
  Share2,
} from "lucide-react";
import { NeumorphicCard, NeumorphicButton } from "@/components/neumorphic";
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
      <NeumorphicCard className="p-5 backdrop-blur-xl bg-slate-900/80 border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Decorative background glow */}
        <div
          className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[60px] opacity-20 pointer-events-none"
          style={{ backgroundColor: color }}
        />

        {/* Header */}
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: color }}
            >
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">
                {node.label || `${config?.label || "Node"} ${node.entity_id}`}
              </h3>
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider opacity-80">
                {node.type}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Details List */}
        <div className="space-y-4 mb-6 relative z-10">
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
          <NeumorphicButton
            variant="primary"
            className="flex-1 flex items-center justify-center gap-2"
            onClick={handleOpen}
          >
            <span>Open</span>
            <ExternalLink className="w-4 h-4" />
          </NeumorphicButton>
          <NeumorphicButton
            variant="ghost"
            onClick={() => {
              // TODO: Focus view on this node
              // For now just console log
              console.log("Focus on node", node.id);
            }}
          >
            Focus
          </NeumorphicButton>
        </div>
      </NeumorphicCard>
    </div>
  );
};
