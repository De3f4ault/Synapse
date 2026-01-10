/**
 * SourcesFooter - Citations Display at Message Bottom
 *
 * Chat-specific component for grounding sources.
 * Shows list of sources used for AI response.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SourceRef } from '@/shared/rendering/schema';

interface SourcesFooterProps {
    sources: SourceRef[];
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

    return (
        <div className={cn('mt-3 pt-3 border-t border-zinc-700/50', className)}>
            {/* Header */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
            >
                <FileText className="size-3.5" />
                <span>{sources.length} source{sources.length !== 1 ? 's' : ''}</span>
                {isExpanded ? (
                    <ChevronUp className="size-3.5" />
                ) : (
                    <ChevronDown className="size-3.5" />
                )}
            </button>

            {/* Source list */}
            {isExpanded && (
                <div className="mt-2 space-y-2">
                    {sources.map((source, index) => (
                        <div
                            key={index}
                            className="flex items-start gap-2 p-2 rounded bg-zinc-800/50 text-xs"
                        >
                            <span className="font-mono text-cyan-400 shrink-0">[{index + 1}]</span>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-zinc-200 truncate">
                                    {source.title}
                                </div>
                                {source.snippet && (
                                    <p className="text-zinc-400 line-clamp-2 mt-0.5">
                                        {source.snippet}
                                    </p>
                                )}
                            </div>
                            {source.url && (
                                <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-cyan-400 hover:text-cyan-300 shrink-0"
                                >
                                    <ExternalLink className="size-3.5" />
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SourcesFooter;
