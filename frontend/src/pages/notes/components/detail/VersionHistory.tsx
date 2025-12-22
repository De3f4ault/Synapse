import React from "react";
import { motion } from "framer-motion";
import { Clock, GitBranch } from "lucide-react";
import { format } from "date-fns";

interface Version {
  id: number;
  timestamp: Date;
  message: string;
  author?: string;
}

interface VersionHistoryProps {
  versions: Version[];
  onRestore?: (versionId: number) => void;
}

/**
 * Display version history for a note (placeholder for future implementation)
 */
export const VersionHistory: React.FC<VersionHistoryProps> = ({
  versions,
  onRestore,
}) => {
  if (versions.length === 0) {
    return (
      <div className="p-8 text-center">
        <GitBranch className="w-12 h-12 text-slate-700 mx-auto mb-4" />
        <p className="text-sm text-slate-500 font-mono">
          No version history available
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-mono text-cyan-400 uppercase tracking-wider mb-4">
        Version History
      </h3>

      {versions.map((version, index) => (
        <motion.div
          key={version.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="group p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all cursor-pointer"
          onClick={() => onRestore?.(version.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-white group-hover:text-cyan-100 mb-1">
                {version.message}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock size={10} />
                {format(version.timestamp, "MMM d, yyyy HH:mm")}
                {version.author && <span>• {version.author}</span>}
              </div>
            </div>
            <button className="opacity-0 group-hover:opacity-100 text-xs text-cyan-400 hover:text-cyan-300 transition-opacity">
              Restore
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
