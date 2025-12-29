/**
 * CitationBadge - Inline Citation Reference
 *
 * Chat-specific component for grounding sources.
 * Not in shared/rendering because it depends on chat context.
 */

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CitationBadgeProps {
    index: number;
    title: string;
    url?: string;
    onClick?: () => void;
    className?: string;
}

export const CitationBadge: React.FC<CitationBadgeProps> = ({
    index,
    title,
    url,
    onClick,
    className,
}) => {
    const handleClick = () => {
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
        onClick?.();
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
                'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors',
                'border border-cyan-500/20',
                className
            )}
            title={title}
        >
            <span className="font-mono">[{index}]</span>
            {url && <ExternalLink className="size-2.5" />}
        </button>
    );
};

export default CitationBadge;
