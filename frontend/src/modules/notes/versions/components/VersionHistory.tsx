/**
 * Notes Module - VersionHistory Component
 * Displays version history with restore functionality.
 *
 * MIGRATED FROM: pages/notes/components/detail/VersionHistory.tsx
 */

import React from "react";
import { motion } from "framer-motion";
import { Clock, GitBranch, RotateCcw, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { NoteVersion } from "../hooks/useNoteVersions";

// ============================================================================
// Types
// ============================================================================

interface VersionHistoryProps {
    versions: NoteVersion[];
    onRestore?: (versionNumber: number) => void;
    isRestoring?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Version history panel for notes.
 */
export const VersionHistory: React.FC<VersionHistoryProps> = ({
    versions,
    onRestore,
    isRestoring = false,
}) => {
    if (versions.length === 0) {
        return (
            <div className="p-8 text-center">
                <GitBranch className="w-12 h-12 text-foreground/70 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground font-mono">
                    No version history available
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                    Versions are created when you save changes
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-mono text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                <GitBranch size={14} />
                Version History
                <span className="text-muted-foreground">({versions.length})</span>
            </h3>

            {versions.map((version, index) => (
                <motion.div
                    key={version.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group p-3 bg-foreground/5 hover:bg-muted border border-border rounded-lg transition-all"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                                    v{version.version_number}
                                </span>
                                <span className="text-sm text-foreground truncate">
                                    {version.title || "Untitled"}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock size={10} />
                                {format(new Date(version.created_at), "MMM d, yyyy HH:mm")}
                            </div>
                        </div>

                        <button
                            onClick={() => onRestore?.(version.version_number)}
                            disabled={isRestoring || index === 0}
                            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:text-muted-foreground disabled:cursor-not-allowed transition-all px-2 py-1 bg-primary/10 hover:bg-primary/20 rounded"
                            title={index === 0 ? "This is the current version" : "Restore this version"}
                        >
                            {isRestoring ? (
                                <Loader2 size={12} className="animate-spin" />
                            ) : (
                                <RotateCcw size={12} />
                            )}
                            {index === 0 ? "Current" : "Restore"}
                        </button>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};
