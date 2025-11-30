import { motion, AnimatePresence } from 'framer-motion';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ExternalLink,
    Calendar,
    Target,
    Link2,
    X,
    Sparkles
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { GraphNode } from '../../types/graph.types';
import { getNodeIcon } from './GraphNode';

interface NodeDetailModalProps {
    node: GraphNode | null;
    connections?: GraphNode[];
    onClose: () => void;
    onNodeClick?: (node: GraphNode) => void;
}

/**
 * NodeDetailModal - "Mini AI Window" Style
 * Dark glass backdrop, neon accents, and crisp details.
 */
export function NodeDetailModal({
    node,
    connections = [],
    onClose,
    onNodeClick
}: NodeDetailModalProps) {
    if (!node) return null;
    const Icon = getNodeIcon(node.type);

    return (
        <Dialog open={!!node} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md bg-[#0A0A0A]/95 backdrop-blur-2xl border border-white/10 shadow-2xl p-0 gap-0 overflow-hidden">

        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
        <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-bold text-white tracking-wide">Node Inspection</span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
        <X className="w-4 h-4" />
        </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
        {/* Title Block */}
        <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30 flex-shrink-0">
        <Icon className="w-5 h-5 text-purple-400" />
        </div>
        <div>
        <h2 className="text-lg font-bold text-white leading-tight">{node.label}</h2>
        <div className="flex items-center gap-2 mt-1">
        <Badge variant="outline" className="text-[10px] uppercase border-white/10 text-slate-400 bg-white/5">
        {node.type}
        </Badge>
        <span className="text-[10px] text-slate-500 font-mono">
        ID-{node.id.slice(0,4)}
        </span>
        </div>
        </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-white/5 border border-white/5">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Created</span>
        <span className="text-sm font-medium text-slate-200">
        {node.metadata.createdAt ? formatRelativeTime(node.metadata.createdAt) : 'Unknown'}
        </span>
        </div>
        <div className="p-3 rounded-lg bg-white/5 border border-white/5">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Status</span>
        <span className="text-sm font-medium text-emerald-400">Active</span>
        </div>
        </div>

        {/* Connections */}
        {connections.length > 0 && (
            <div>
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Link2 className="w-3 h-3" /> Linked Nodes ({connections.length})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
            {connections.slice(0, 5).map(conn => {
                const ConnIcon = getNodeIcon(conn.type);
                return (
                    <button
                    key={conn.id}
                    onClick={() => onNodeClick?.(conn)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors text-left group"
                    >
                    <ConnIcon className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                    <span className="text-xs text-slate-400 group-hover:text-slate-200 truncate flex-1">
                    {conn.label}
                    </span>
                    </button>
                );
            })}
            </div>
            </div>
        )}

        {/* Action Bar */}
        <div className="flex gap-3 pt-2">
        <Button className="flex-1 bg-white text-black hover:bg-slate-200 font-bold text-xs" onClick={() => window.open(node.metadata.url || '#', '_blank')}>
        <ExternalLink className="w-3 h-3 mr-2" /> Open Resource
        </Button>
        </div>
        </div>
        </DialogContent>
        </Dialog>
    );
}
