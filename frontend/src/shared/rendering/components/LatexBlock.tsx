/**
 * LatexBlock - Math Rendering with KaTeX
 *
 * INVARIANT: Stateless, session-agnostic.
 * Renders LaTeX/math notation, not meaning.
 */

import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { cn } from '@/lib/utils';

interface LatexBlockProps {
    content: string;
    inline?: boolean;
    className?: string;
}

export const LatexBlock: React.FC<LatexBlockProps> = ({
    content,
    inline = false,
    className,
}) => {
    const html = useMemo(() => {
        try {
            return katex.renderToString(content, {
                throwOnError: false,
                displayMode: !inline,
                output: 'html',
                trust: false,
                strict: false,
            });
        } catch (error) {
            console.error('LaTeX rendering error:', error);
            // Return escaped content on error
            return `<code class="text-red-400">${content}</code>`;
        }
    }, [content, inline]);

    if (inline) {
        return (
            <span
                className={cn('inline-block', className)}
                dangerouslySetInnerHTML={{ __html: html }}
            />
        );
    }

    return (
        <div
            className={cn(
                'my-4 overflow-x-auto py-2 flex justify-center',
                className
            )}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
};

export default LatexBlock;
