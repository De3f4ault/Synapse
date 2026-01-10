/**
 * ExpandableBlock - Collapsible Content Sections
 *
 * INVARIANT: Stateless (except local UI state), session-agnostic.
 * Renders structure, not meaning.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpandableBlockProps {
    title: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
    className?: string;
}

export const ExpandableBlock: React.FC<ExpandableBlockProps> = ({
    title,
    children,
    defaultExpanded = false,
    className,
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div className={cn('my-2 border border-zinc-700 rounded-lg overflow-hidden', className)}>
            {/* Header - clickable */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left"
            >
                {isExpanded ? (
                    <ChevronDown className="size-4 text-zinc-400 shrink-0" />
                ) : (
                    <ChevronRight className="size-4 text-zinc-400 shrink-0" />
                )}
                <span className="text-sm font-medium text-zinc-200">{title}</span>
            </button>

            {/* Content - collapsible */}
            <div
                className={cn(
                    'overflow-hidden transition-all duration-200',
                    isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                )}
            >
                <div className="px-4 py-3 border-t border-zinc-700/50">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default ExpandableBlock;
