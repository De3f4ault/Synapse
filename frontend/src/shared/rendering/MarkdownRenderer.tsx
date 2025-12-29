/**
 * MarkdownRenderer - Smart Structurally, Dumb Semantically
 *
 * INVARIANT: Stateless, session-agnostic.
 * INVARIANT: Understands structure (code fences, tables), not meaning (citations, context).
 *
 * Plugin architecture allows extending without modifying core.
 */

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './components/CodeBlock';
import { cn } from '@/lib/utils';

// ==================== TYPES ====================

interface MarkdownRendererProps {
    content: string;
    className?: string;
    // Plugin hooks for extensibility
    onCodeBlock?: (language: string, content: string) => React.ReactNode;
    onLink?: (href: string, children: React.ReactNode) => React.ReactNode;
}

// ==================== COMPONENT ====================

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
    content,
    className,
    onCodeBlock,
    onLink,
}) => {
    // Build components config based on plugins
    const components = useMemo(() => ({
        // Code blocks with syntax highlighting
        code({ node, inline, className: codeClassName, children, ...props }: any) {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const language = match ? match[1] : 'text';
            const codeContent = String(children).replace(/\n$/, '');

            // Inline code
            if (inline) {
                return (
                    <code
                        className="bg-zinc-800 text-cyan-400 px-1.5 py-0.5 rounded text-sm font-mono"
                        {...props}
                    >
                        {children}
                    </code>
                );
            }

            // Block code - use plugin or default CodeBlock
            if (onCodeBlock && language) {
                return onCodeBlock(language, codeContent);
            }

            return <CodeBlock content={codeContent} language={language} />;
        },

        // Pre wrapper - handled by code block
        pre({ children }: any) {
            return <>{children}</>;
        },

        // Links with external handling
        a({ href, children, ...props }: any) {
            if (onLink && href) {
                return onLink(href, children);
            }

            const isExternal = href?.startsWith('http');
            return (
                <a
                    href={href}
                    className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noopener noreferrer' : undefined}
                    {...props}
                >
                    {children}
                </a>
            );
        },

        // Tables with responsive wrapper
        table({ children, ...props }: any) {
            return (
                <div className="overflow-x-auto my-4">
                    <table className="min-w-full border-collapse" {...props}>
                        {children}
                    </table>
                </div>
            );
        },

        th({ children, ...props }: any) {
            return (
                <th
                    className="border border-zinc-700 bg-zinc-800 px-4 py-2 text-left font-semibold"
                    {...props}
                >
                    {children}
                </th>
            );
        },

        td({ children, ...props }: any) {
            return (
                <td className="border border-zinc-700 px-4 py-2" {...props}>
                    {children}
                </td>
            );
        },

        // Blockquotes with styling
        blockquote({ children, ...props }: any) {
            return (
                <blockquote
                    className="border-l-4 border-cyan-500/50 pl-4 my-4 text-zinc-400 italic"
                    {...props}
                >
                    {children}
                </blockquote>
            );
        },

        // Lists
        ul({ children, ...props }: any) {
            return (
                <ul className="list-disc list-inside my-2 space-y-1" {...props}>
                    {children}
                </ul>
            );
        },

        ol({ children, ...props }: any) {
            return (
                <ol className="list-decimal list-inside my-2 space-y-1" {...props}>
                    {children}
                </ol>
            );
        },

        // Headings
        h1({ children, ...props }: any) {
            return (
                <h1 className="text-2xl font-bold mt-6 mb-3" {...props}>
                    {children}
                </h1>
            );
        },

        h2({ children, ...props }: any) {
            return (
                <h2 className="text-xl font-semibold mt-5 mb-2" {...props}>
                    {children}
                </h2>
            );
        },

        h3({ children, ...props }: any) {
            return (
                <h3 className="text-lg font-medium mt-4 mb-2" {...props}>
                    {children}
                </h3>
            );
        },

        // Paragraphs
        p({ children, ...props }: any) {
            return (
                <p className="my-2 leading-relaxed" {...props}>
                    {children}
                </p>
            );
        },

        // Horizontal rule
        hr({ ...props }: any) {
            return <hr className="border-zinc-700 my-6" {...props} />;
        },

        // Strong/Bold
        strong({ children, ...props }: any) {
            return (
                <strong className="font-semibold text-white" {...props}>
                    {children}
                </strong>
            );
        },

        // Emphasis/Italic
        em({ children, ...props }: any) {
            return (
                <em className="italic text-zinc-300" {...props}>
                    {children}
                </em>
            );
        },
    }), [onCodeBlock, onLink]);

    return (
        <div className={cn('prose prose-invert prose-zinc max-w-none', className)}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={components}
            >
                {content || ''}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownRenderer;
