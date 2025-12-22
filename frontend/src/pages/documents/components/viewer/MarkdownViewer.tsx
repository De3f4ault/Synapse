import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

// Import syntax highlighting theme
import 'highlight.js/styles/github-dark.css';

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
 * Markdown viewer with GFM support and syntax highlighting
 */
export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
    content,
    theme = 'dark',
    className = '',
}) => {
    const { bg, prose } = themeClasses[theme];

    return (
        <div className={`w-full h-full overflow-auto ${bg} ${className}`}>
            <div className="max-w-4xl mx-auto p-8">
                <article className={`prose prose-sm lg:prose-base ${prose} max-w-none`}>
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                            // Custom styling for code blocks
                            pre: ({ children, ...props }) => (
                                <pre
                                    className="rounded-lg overflow-x-auto bg-zinc-900 p-4"
                                    {...props}
                                >
                                    {children}
                                </pre>
                            ),
                            code: ({ className, children, ...props }) => {
                                const isInline = !className;
                                return isInline ? (
                                    <code
                                        className="bg-zinc-800 text-cyan-400 px-1.5 py-0.5 rounded text-sm"
                                        {...props}
                                    >
                                        {children}
                                    </code>
                                ) : (
                                    <code className={className} {...props}>
                                        {children}
                                    </code>
                                );
                            },
                            // Enhanced table styling
                            table: ({ children, ...props }) => (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full" {...props}>
                                        {children}
                                    </table>
                                </div>
                            ),
                            // Link styling
                            a: ({ children, href, ...props }) => (
                                <a
                                    href={href}
                                    className="text-cyan-400 hover:text-cyan-300 underline"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    {...props}
                                >
                                    {children}
                                </a>
                            ),
                        }}
                    >
                        {content || '*No content available*'}
                    </ReactMarkdown>
                </article>
            </div>
        </div>
    );
};

export default MarkdownViewer;
