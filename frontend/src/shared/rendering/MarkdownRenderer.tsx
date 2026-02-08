/**
 * MarkdownRenderer - Smart Structurally, Dumb Semantically
 *
 * INVARIANT: Stateless, session-agnostic.
 * INVARIANT: Understands structure (code fences, tables, math), not meaning (citations, context).
 *
 * Features:
 * - Code blocks with syntax highlighting and copy buttons
 * - Tables with Claude-style clean rendering (compact inline code in cells)
 * - LaTeX/math rendering via KaTeX
 * - GFM (GitHub Flavored Markdown) support
 */

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { CodeBlock } from './components/CodeBlock';
import { cn } from '@/lib/utils';
import { ChatFlashcardSet } from '@/pages/chat/core/components/ChatFlashcardSet';

// ==================== TYPES ====================

interface MarkdownRendererProps {
    content: string;
    className?: string;
    // Plugin hooks for extensibility
    onCodeBlock?: (language: string, content: string) => React.ReactNode;
    onLink?: (href: string, children: React.ReactNode) => React.ReactNode;
}

// ==================== HELPER COMPONENTS ====================

// Context to detect if we're inside a table
const TableContext = React.createContext(false);

// Inline code component (used inside tables and for short code)
const InlineCode: React.FC<{ children: React.ReactNode; isInTable?: boolean }> = ({
    children,
    isInTable = false
}) => (
    <code
        className={cn(
            "px-1.5 py-0.5 rounded font-mono text-sm",
            isInTable
                ? "bg-rose-500/10 text-rose-200 border border-rose-500/20 whitespace-pre-wrap break-words inline-block min-w-0 max-w-full"
                : "bg-zinc-800/80 text-cyan-400"
        )}
        style={isInTable ? { fontSize: '12.5px' } : undefined}
    >
        {children}
    </code>
);

// ==================== MAIN COMPONENT ====================

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
    content,
    className,
    onCodeBlock,
    onLink,
}) => {
    // Build components config based on plugins
    const components = useMemo(() => ({
        // Code blocks with syntax highlighting
        code({ className: codeClassName, children }: any) {
            const isInsideTable = React.useContext(TableContext);
            const match = /language-(\w+)/.exec(codeClassName || '');
            const language = match ? match[1] : '';
            const codeContent = String(children).replace(/\n$/, '');

            // Determine if this is inline code or a code block
            const hasLanguage = !!match;
            const isMultiLine = codeContent.includes('\n');
            const isLongContent = codeContent.length > 80;
            const isBlock = hasLanguage || isMultiLine || isLongContent;

            // Inside tables: ALWAYS render as inline code (Claude-style) unless it's a very large block
            if (isInsideTable) {
                // Even multi-line code in tables should often be compact, but if it has a language, 
                // we might still want syntax highlighting? Claude uses simple text for code in tables usually.
                // Let's stick to the inline style for consistency with the request "inner code within the table"
                return <InlineCode isInTable={true}>{children}</InlineCode>;
            }

            // Inline code - simple styled span
            if (!isBlock) {
                return <InlineCode>{children}</InlineCode>;
            }

            // Special case: markdown code blocks should be RENDERED, not shown as code
            if (language === 'markdown' || language === 'md') {
                return (
                    <div className="my-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-700/50">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={components}
                        >
                            {codeContent}
                        </ReactMarkdown>
                    </div>
                );
            }

            // ========== STUDY BLOCKS: FLASHCARDS & QUIZZES ==========
            // Detect synapse-flashcards, json, or any code block that looks like flashcard JSON
            const mightBeFlashcardJson = 
                language === 'synapse-flashcards' || 
                language === 'json' ||
                (!language && codeContent.trim().startsWith('{'));
            
            if (mightBeFlashcardJson) {
                try {
                    const data = JSON.parse(codeContent);
                    // Check if it's a flashcard set (has cards array with front/back)
                    if (data.cards && Array.isArray(data.cards) && data.cards.length > 0) {
                        const firstCard = data.cards[0];
                        if (firstCard && (firstCard.front || firstCard.question)) {
                            return (
                                <ChatFlashcardSet
                                    title={data.title || 'Flashcards'}
                                    cards={data.cards.map((c: any) => ({
                                        front: c.front || c.question || '',
                                        back: c.back || c.answer || ''
                                    }))}
                                    onSave={(cards) => {
                                        // TODO: Integrate with flashcard API to save to deck
                                        console.log('Save flashcards:', cards);
                                    }}
                                />
                            );
                        }
                    }
                } catch {
                    // Not valid JSON, fall through to regular code block
                }
            }

            // Block code - use plugin or default CodeBlock
            if (onCodeBlock && language) {
                return onCodeBlock(language, codeContent);
            }

            return <CodeBlock content={codeContent} language={language || 'text'} showLineNumbers={isMultiLine} />;
        },

        // Pre wrapper - handled by code block
        pre({ children }: any) {
            // In tables, pre should not wrap code blocks in extra div logic if we can avoid it, 
            // but since we handle 'code' above, this mostly just passes children.
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

        // Tables - Phase 4: Hybrid Premium (DeepSeek/Claude inspired)
        table({ children, ...props }: any) {
            return (
                <TableContext.Provider value={true}>
                    <div className="my-8 w-full overflow-hidden rounded-lg border border-white/5 bg-white/[0.01]">
                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent pb-1">
                            <table
                                className="w-full text-left text-sm border-collapse"
                                {...props}
                            >
                                {children}
                            </table>
                        </div>
                    </div>
                </TableContext.Provider>
            );
        },

        thead({ children, ...props }: any) {
            return (
                <thead className="border-b border-white/5 bg-white/[0.01]" {...props}>
                    {children}
                </thead>
            );
        },

        tbody({ children, ...props }: any) {
            return (
                <tbody className="divide-y divide-white/5" {...props}>
                    {children}
                </tbody>
            );
        },

        tr({ children, ...props }: any) {
            return (
                <tr
                    className="group transition-colors hover:bg-white/[0.02]"
                    {...props}
                >
                    {children}
                </tr>
            );
        },

        th({ children, ...props }: any) {
            return (
                <th
                    className="py-3 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500 select-none align-top whitespace-nowrap"
                    {...props}
                >
                    {children}
                </th>
            );
        },

        // Table cells - simplified with proper text handling
        td({ children, ...props }: any) {
            return (
                <td
                    className="py-3 px-4 align-top text-zinc-300 leading-relaxed min-w-[120px] first:font-medium first:text-zinc-200"
                    style={{
                        wordBreak: 'break-word',
                        maxWidth: '400px',
                    }}
                    {...props}
                >
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
                <ul className="list-disc list-inside my-2 space-y-1 pl-2" {...props}>
                    {children}
                </ul>
            );
        },

        ol({ children, ...props }: any) {
            return (
                <ol className="list-decimal list-inside my-2 space-y-1 pl-2" {...props}>
                    {children}
                </ol>
            );
        },

        li({ children, ...props }: any) {
            return (
                <li className="text-zinc-300" {...props}>
                    {children}
                </li>
            );
        },

        // Headings
        h1({ children, ...props }: any) {
            return (
                <h1 className="text-2xl font-bold mt-6 mb-3 text-white" {...props}>
                    {children}
                </h1>
            );
        },

        h2({ children, ...props }: any) {
            return (
                <h2 className="text-xl font-semibold mt-5 mb-2 text-white" {...props}>
                    {children}
                </h2>
            );
        },

        h3({ children, ...props }: any) {
            return (
                <h3 className="text-lg font-medium mt-4 mb-2 text-zinc-100" {...props}>
                    {children}
                </h3>
            );
        },

        h4({ children, ...props }: any) {
            return (
                <h4 className="text-base font-medium mt-3 mb-1.5 text-zinc-200" {...props}>
                    {children}
                </h4>
            );
        },

        // Paragraphs
        p({ children, ...props }: any) {
            return (
                <p className="my-2 leading-relaxed text-zinc-300" {...props}>
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
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={components}
            >
                {content || ''}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownRenderer;
