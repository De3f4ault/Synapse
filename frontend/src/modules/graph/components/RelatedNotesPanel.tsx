/**
 * Graph Module - Related Notes Panel
 *
 * UI component for displaying notes related to the current note.
 * Shows backlinks, outlinks, and related notes in a collapsible panel.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Link2, ArrowRight, ArrowLeft, Sparkles, FileText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRelatedNotes } from "../hooks/useRelatedNotes";
import { EmptyState } from "@/shared/ui";
import type { GraphNode } from "../core/types";

// ============================================================================
// Types
// ============================================================================

export interface RelatedNotesPanelProps {
    /** Note ID to show relations for */
    noteId: number;

    /** Callback when a related note is clicked */
    onNoteClick?: (noteId: number) => void;

    /** Additional CSS classes */
    className?: string;

    /** Collapsed sections (for controlled state) */
    collapsedSections?: Set<"backlinks" | "outlinks" | "related">;

    /** Toggle section callback */
    onToggleSection?: (section: "backlinks" | "outlinks" | "related") => void;
}

// ============================================================================
// Component
// ============================================================================

export function RelatedNotesPanel({
    noteId,
    onNoteClick,
    className,
}: RelatedNotesPanelProps) {
    const result = useRelatedNotes(noteId);

    const { backlinks, outlinks, related, hasGraphData, connectionCount } = result;

    // No graph data yet
    if (!hasGraphData) {
        return (
            <div className={cn("p-4", className)}>
                <EmptyState
                    icon={<Link2 className="h-10 w-10" />}
                    title="No connections yet"
                    description="Links will appear here when you reference other notes using [[wikilinks]]"
                    size="sm"
                />
            </div>
        );
    }

    // Has data but no connections
    if (connectionCount === 0 && related.length === 0) {
        return (
            <div className={cn("p-4", className)}>
                <EmptyState
                    icon={<Link2 className="h-10 w-10" />}
                    title="No connections"
                    description="Add [[wikilinks]] to connect this note with others"
                    size="sm"
                />
            </div>
        );
    }

    return (
        <div className={cn("space-y-4", className)}>
            {/* Backlinks Section */}
            {backlinks.length > 0 && (
                <RelatedSection
                    title="Backlinks"
                    description="Notes that link to this note"
                    icon={<ArrowLeft className="h-4 w-4" />}
                    nodes={backlinks}
                    onNoteClick={onNoteClick}
                />
            )}

            {/* Outlinks Section */}
            {outlinks.length > 0 && (
                <RelatedSection
                    title="Outlinks"
                    description="Notes this note links to"
                    icon={<ArrowRight className="h-4 w-4" />}
                    nodes={outlinks}
                    onNoteClick={onNoteClick}
                />
            )}

            {/* Related Section (2-hop) */}
            {related.length > 0 && (
                <RelatedSection
                    title="Related"
                    description="Notes connected through shared links"
                    icon={<Sparkles className="h-4 w-4" />}
                    nodes={related}
                    onNoteClick={onNoteClick}
                    variant="secondary"
                />
            )}
        </div>
    );
}

// ============================================================================
// Sub-components
// ============================================================================

interface RelatedSectionProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    nodes: GraphNode[];
    onNoteClick?: (noteId: number) => void;
    variant?: "primary" | "secondary";
}

function RelatedSection({
    title,
    description,
    icon,
    nodes,
    onNoteClick,
    variant = "primary",
}: RelatedSectionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-2">
                <div
                    className={cn(
                        "p-1.5 rounded-md",
                        variant === "primary"
                            ? "bg-cyan-500/10 text-cyan-400"
                            : "bg-purple-500/10 text-purple-400"
                    )}
                >
                    {icon}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{title}</span>
                        <span className="text-xs text-slate-500">({nodes.length})</span>
                    </div>
                    <p className="text-xs text-slate-500">{description}</p>
                </div>
            </div>

            {/* Note List */}
            <div className="space-y-1">
                <AnimatePresence>
                    {nodes.map((node, index) => (
                        <NoteCard
                            key={node.id}
                            node={node}
                            onClick={onNoteClick}
                            index={index}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

interface NoteCardProps {
    node: GraphNode;
    onClick?: (noteId: number) => void;
    index: number;
}

function NoteCard({ node, onClick, index }: NoteCardProps) {
    const handleClick = () => {
        if (onClick && node.entityId) {
            onClick(node.entityId);
        }
    };

    const isPlaceholder = node.metadata?.placeholder === true;

    return (
        <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ delay: index * 0.05 }}
            onClick={handleClick}
            disabled={isPlaceholder}
            className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors group",
                isPlaceholder
                    ? "bg-white/[0.02] text-slate-500 cursor-not-allowed"
                    : "bg-white/[0.03] hover:bg-white/[0.08] text-slate-300"
            )}
        >
            <FileText className="h-4 w-4 text-slate-500 flex-shrink-0" />
            <span className="flex-1 truncate text-sm">
                {node.label}
            </span>
            {!isPlaceholder && (
                <ChevronRight className="h-4 w-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
        </motion.button>
    );
}

// ============================================================================
// Compact Variant (for sidebar)
// ============================================================================

export interface RelatedNotesCompactProps {
    noteId: number;
    onNoteClick?: (noteId: number) => void;
    className?: string;
}

/**
 * Compact version showing just backlink count and list.
 */
export function RelatedNotesCompact({
    noteId,
    onNoteClick,
    className,
}: RelatedNotesCompactProps) {
    const { backlinks, connectionCount } = useRelatedNotes(noteId);

    if (connectionCount === 0) {
        return null; // Don't render if no connections
    }

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex items-center gap-2 text-xs text-slate-500">
                <Link2 className="h-3 w-3" />
                <span>{connectionCount} connections</span>
            </div>

            {backlinks.length > 0 && (
                <div className="space-y-1">
                    {backlinks.slice(0, 3).map((node, index) => (
                        <NoteCard
                            key={node.id}
                            node={node}
                            onClick={onNoteClick}
                            index={index}
                        />
                    ))}
                    {backlinks.length > 3 && (
                        <div className="text-xs text-slate-500 px-3 py-1">
                            +{backlinks.length - 3} more
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
