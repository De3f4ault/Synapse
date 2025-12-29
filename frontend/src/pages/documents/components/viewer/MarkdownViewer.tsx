/**
 * MarkdownViewer - Thin wrapper around shared MarkdownRenderer
 *
 * NOTE: This file exists for backwards compatibility.
 * New code should import directly from @/shared/rendering.
 *
 * Provides theme prop for document-specific theming.
 */

import React from 'react';
import { MarkdownRenderer } from '@/shared/rendering';
import { cn } from '@/lib/utils';

export type MarkdownTheme = 'light' | 'sepia' | 'twilight' | 'dark';

interface MarkdownViewerProps {
    content: string;
    theme?: MarkdownTheme;
    className?: string;
}

const themeClasses: Record<MarkdownTheme, { bg: string; prose: string }> = {
    light: { bg: 'bg-white', prose: 'prose-slate' },
    sepia: { bg: 'bg-amber-50', prose: 'prose-amber' },
    twilight: { bg: 'bg-slate-900', prose: 'prose-invert' },
    dark: { bg: 'bg-zinc-950', prose: 'prose-invert' },
};

/**
 * Markdown viewer with theme support
 * @deprecated Use MarkdownRenderer from @/shared/rendering directly
 */
export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
    content,
    theme = 'dark',
    className = '',
}) => {
    const { bg, prose } = themeClasses[theme];

    return (
        <div className={cn('w-full h-full overflow-auto', bg, className)}>
            <div className="max-w-4xl mx-auto p-8">
                <MarkdownRenderer
                    content={content || '*No content available*'}
                    className={prose}
                />
            </div>
        </div>
    );
};

export default MarkdownViewer;
