/**
 * CitationBadge - NotebookLM-style Inline Citation
 *
 * Renders as a small numbered pill in the text.
 * On hover, shows a tooltip with source title, confidence, and snippet.
 * On click, scrolls to the corresponding source in SourcesFooter.
 */

import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { GroundingSource } from '../engine/types';

interface CitationBadgeProps {
    index: number;
    source?: GroundingSource;
    className?: string;
}

export const CitationBadge: React.FC<CitationBadgeProps> = ({
    index,
    source,
    className,
}) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const badgeRef = useRef<HTMLButtonElement>(null);

    const handleClick = () => {
        // Scroll to the source card in the SourcesFooter
        const element = document.getElementById(`grounding-source-${index}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('ring-2', 'ring-primary/60');
            setTimeout(() => element.classList.remove('ring-2', 'ring-primary/60'), 2000);
        }
    };

    const confidencePercent = source?.confidence
        ? Math.round(source.confidence * 100)
        : null;

    return (
        <span className="relative inline-block">
            <button
                ref={badgeRef}
                type="button"
                onClick={handleClick}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className={cn(
                    'inline-flex items-center justify-center',
                    'w-[18px] h-[18px] rounded-full',
                    'text-[10px] font-semibold font-mono leading-none',
                    'bg-primary/15 text-primary',
                    'hover:bg-primary/30 hover:text-primary/80',
                    'border border-primary/25 hover:border-primary/40',
                    'transition-all duration-150 cursor-pointer',
                    'align-super -translate-y-[1px]',
                    className
                )}
                aria-label={`Source ${index}${source ? `: ${source.title}` : ''}`}
            >
                {index}
            </button>

            {/* NotebookLM-style hover tooltip */}
            {showTooltip && source && (
                <div
                    className={cn(
                        'absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2',
                        'w-64 p-3 rounded-lg',
                        'bg-popover border border-border',
                        'shadow-xl shadow-black/40',
                        'animate-in fade-in zoom-in-95 duration-150',
                        'pointer-events-none'
                    )}
                >
                    {/* Source number + title */}
                    <div className="flex items-start gap-2">
                        <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-mono font-bold">
                            {index}
                        </span>
                        <h4 className="text-xs font-medium text-foreground/70 leading-snug line-clamp-2">
                            {source.title}
                        </h4>
                    </div>

                    {/* Snippet preview */}
                    {source.snippet && (
                        <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                            {source.snippet}
                        </p>
                    )}

                    {/* Confidence bar */}
                    {confidencePercent !== null && (
                        <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                                <div
                                    className={cn(
                                        'h-full rounded-full transition-all',
                                        confidencePercent >= 90 ? 'bg-accent-olive' :
                                        confidencePercent >= 70 ? 'bg-amber-400' :
                                        'bg-destructive'
                                    )}
                                    style={{ width: `${confidencePercent}%` }}
                                />
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                                {confidencePercent}%
                            </span>
                        </div>
                    )}

                    {/* Tooltip arrow */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-popover border-r border-b border-border" />
                </div>
            )}
        </span>
    );
};

export default CitationBadge;
