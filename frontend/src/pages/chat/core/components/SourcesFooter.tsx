/**
 * SourcesFooter - NotebookLM-style Collapsible Sources Panel
 *
 * Shows at the bottom of grounded assistant messages.
 * Expandable list of all sources with confidence bars.
 * Source cards have IDs for scroll-to-source from CitationBadge.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GroundingSource } from '../engine/types';

interface SourcesFooterProps {
    sources: GroundingSource[];
    className?: string;
}

export const SourcesFooter: React.FC<SourcesFooterProps> = ({
    sources,
    className,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!sources || sources.length === 0) {
        return null;
    }

    // Deduplicate by title (backend may send same doc multiple times for different chunks)
    const uniqueSources = sources.reduce<GroundingSource[]>((acc, source) => {
        const existing = acc.find(s => s.title === source.title);
        if (existing) {
            // Keep the higher confidence one
            if ((source.confidence ?? 0) > (existing.confidence ?? 0)) {
                Object.assign(existing, source);
            }
        } else {
            acc.push({ ...source });
        }
        return acc;
    }, []);

    return (
        <div className={cn(
            'mt-4 rounded-lg border border-zinc-700/50 bg-zinc-900/50 overflow-hidden',
            'transition-all duration-200',
            className
        )}>
            {/* Header — always visible */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                    'flex w-full items-center justify-between px-4 py-2.5',
                    'text-xs font-medium text-zinc-400',
                    'hover:bg-zinc-800/50 transition-colors',
                    isExpanded && 'border-b border-zinc-700/50'
                )}
            >
                <div className="flex items-center gap-2">
                    <BookOpen className="size-3.5 text-cyan-500/70" />
                    <span>
                        {uniqueSources.length} source{uniqueSources.length !== 1 ? 's' : ''}
                    </span>
                </div>
                {isExpanded ? (
                    <ChevronUp className="size-3.5" />
                ) : (
                    <ChevronDown className="size-3.5" />
                )}
            </button>

            {/* Expanded source list */}
            {isExpanded && (
                <div className="p-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    {uniqueSources.map((source, idx) => {
                        const confidence = source.confidence
                            ? Math.round(source.confidence * 100)
                            : null;

                        return (
                            <div
                                key={source.id || idx}
                                id={`grounding-source-${idx + 1}`}
                                className={cn(
                                    'flex items-start gap-3 p-3 rounded-md',
                                    'bg-zinc-800/40 border border-zinc-700/30',
                                    'hover:bg-zinc-800/60 hover:border-zinc-700/50',
                                    'transition-all duration-200'
                                )}
                            >
                                {/* Source number */}
                                <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/15 text-cyan-400 text-[11px] font-mono font-bold mt-0.5">
                                    {idx + 1}
                                </span>

                                {/* Source details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <FileText className="size-3 text-zinc-500 shrink-0" />
                                            <h4 className="text-xs font-medium text-zinc-200 truncate">
                                                {source.title}
                                            </h4>
                                        </div>
                                        {confidence !== null && (
                                            <span className={cn(
                                                'shrink-0 text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded',
                                                confidence >= 90 ? 'text-emerald-400 bg-emerald-500/10' :
                                                confidence >= 70 ? 'text-amber-400 bg-amber-500/10' :
                                                'text-red-400 bg-red-500/10'
                                            )}>
                                                {confidence}%
                                            </span>
                                        )}
                                    </div>

                                    {/* Confidence bar */}
                                    {confidence !== null && (
                                        <div className="mt-1.5 h-0.5 rounded-full bg-zinc-700/60 overflow-hidden">
                                            <div
                                                className={cn(
                                                    'h-full rounded-full transition-all duration-500',
                                                    confidence >= 90 ? 'bg-emerald-400/70' :
                                                    confidence >= 70 ? 'bg-amber-400/70' :
                                                    'bg-red-400/70'
                                                )}
                                                style={{ width: `${confidence}%` }}
                                            />
                                        </div>
                                    )}

                                    {/* Snippet */}
                                    {source.snippet && (
                                        <p className="mt-1.5 text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
                                            {source.snippet}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default SourcesFooter;
