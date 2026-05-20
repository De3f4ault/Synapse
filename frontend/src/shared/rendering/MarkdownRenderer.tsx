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
 * - [Source N] → CitationBadge inline rendering (via rehype-raw)
 */

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { CodeBlock } from './components/CodeBlock';
import { MermaidBlock } from './components/MermaidBlock';
import { cn } from '@/lib/utils';
import { ChatFlashcardSet } from '@/pages/chat/core/components/ChatFlashcardSet';
import { ChatQuizPreview } from '@/pages/chat/core/components/ChatQuizPreview';
import { CitationBadge } from '@/pages/chat/core/components/CitationBadge';
import { RAGCitationPill } from '@/pages/chat/core/components/RAGCitationPill';
import type { RAGCitation } from '@/pages/chat/core/components/RAGCitationPill';
import type { GroundingSource } from '@/pages/chat/core/engine/types';

// ==================== TYPES ====================

interface MarkdownRendererProps {
    content: string;
    className?: string;
    /** Grounding sources for rendering [Source N] as CitationBadge */
    sources?: GroundingSource[];
    /** RAG citations for rendering [N] as hoverable InlineCitation pills */
    ragCitations?: RAGCitation[];
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
                : "bg-zinc-800/80 text-primary"
        )}
        style={isInTable ? { fontSize: '12.5px' } : undefined}
    >
        {children}
    </code>
);

// ==================== CITATION PRE-PROCESSING ====================

/**
 * Pre-process markdown to replace citation markers with <sup> HTML tags.
 *
 * Handles two patterns:
 *   [Source N]  → Google Grounding citations (CitationBadge)
 *   [N]         → RAG inline citations (RAGCitationPill)
 *
 * rehype-raw passes the HTML through, and the custom `sup` component
 * dispatches to the correct renderer based on the data attribute.
 */
function preprocessCitations(content: string, hasRagCitations: boolean): string {
    // Google Grounding: [Source N] → <sup data-citation="N">
    content = content.replace(
        /\[Source (\d+)\]/g,
        (_match, num) => `<sup data-citation="${num}">[${num}]</sup>`
    );

    // RAG citations: [N] → <sup data-rag-citation="N">
    // Only when ragCitations are available to avoid converting markdown
    // footnote-like patterns in normal responses.
    if (hasRagCitations) {
        content = content.replace(
            /\[(\d+)\]/g,
            (_match, num) => `<sup data-rag-citation="${num}">[${num}]</sup>`
        );
    }

    return content;
}

// ==================== LATEX DELIMITER NORMALISATION ====================

/**
 * Normalise non-standard LaTeX delimiters to the format remark-math expects.
 *
 * AI models (e.g. Gemini, GPT) often emit:
 *   \( ... \)   for inline math
 *   \[ ... \]   for display-block math
 *
 * remark-math only recognises:
 *   $ ... $     for inline math
 *   $$ ... $$   for display-block math
 *
 * NOTE on JS replacement strings:
 *   In String.prototype.replace, $$ → literal $, $1 → first capture group.
 *   So '$$$1$$' produces  $<capture>$  (inline)
 *   and '\n$$$$\n$1\n$$$$\n' produces  \n$$\n<capture>\n$$\n  (display)
 */
function normalizeLatexDelimiters(content: string): string {
    // Display math first (must come before inline to avoid partial matches)
    //   \[ ... \]  →  \n$$\n...\n$$\n
    content = content.replace(/\\\[([\.\s\S]*?)\\\]/g, '\n$$$$\n$1\n$$$$\n');
    // Inline math
    //   \( ... \)  →  $...$
    content = content.replace(/\\\((.*?)\\\)/gs, '$$$1$$');
    return content;
}

// ==================== MAIN COMPONENT ====================

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
    content,
    className,
    sources,
    ragCitations,
    onCodeBlock,
    onLink,
}) => {
    const hasRagCitations = !!(ragCitations && ragCitations.length > 0);

    // Pre-process content:
    // 1. Normalise \(...\) / \[...\] LaTeX delimiters → $ / $$ for remark-math
    // 2. Replace [Source N] / [N] with <sup> tags for citation rendering
    const processedContent = useMemo(() => {
        if (!content) return '';
        return preprocessCitations(normalizeLatexDelimiters(content), hasRagCitations);
    }, [content, hasRagCitations]);

    // Build components config based on plugins
    const components = useMemo(() => ({
        // Citation superscripts — rendered from <sup data-citation/data-rag-citation> tags
        sup({ node, children, ...props }: any) {
            // RAG inline citations: [N] → hoverable pill with excerpt
            const ragCitationIndex = node?.properties?.dataRagCitation;
            if (ragCitationIndex && ragCitations) {
                const idx = parseInt(ragCitationIndex, 10);
                const citation = ragCitations[idx - 1]; // 1-indexed
                if (!citation) return null; // Hallucination guard: silent drop
                return <RAGCitationPill citation={citation} />;
            }

            // Google Grounding citations: [Source N] → CitationBadge
            const citationIndex = node?.properties?.dataCitation;
            if (citationIndex) {
                const sourceIdx = parseInt(citationIndex, 10);
                const source = sources?.[sourceIdx - 1];
                return <CitationBadge index={sourceIdx} source={source} />;
            }

            // Normal superscript (e.g. math exponents)
            return <sup {...props}>{children}</sup>;
        },

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

            // Inside tables: ALWAYS render as inline code (Claude-style)
            if (isInsideTable) {
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

            // ── Mermaid diagrams ──────────────────────────────────────────
            if (language === 'mermaid') {
                return <MermaidBlock content={codeContent} />;
            }

            // ── Study Blocks: synapse-flashcards ──────────────────────────
            const mightBeFlashcardJson =
                language === 'synapse-flashcards' ||
                language === 'json' ||
                (!language && codeContent.trim().startsWith('{'));

            if (mightBeFlashcardJson) {
                try {
                    const data = JSON.parse(codeContent);
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

            // ── Study Blocks: synapse-quiz ────────────────────────────────
            if (language === 'synapse-quiz') {
                try {
                    const data = JSON.parse(codeContent);
                    if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
                        const normalizedQuestions = data.questions.map((q: any, idx: number) => ({
                            id: q.id || `q${idx + 1}`,
                            type: q.type || 'multiple_choice',
                            prompt: q.prompt || q.question || '',
                            options: Array.isArray(q.options) ? q.options : undefined,
                            correctIndex: q.correctIndex ?? q.correct_index,
                            correctAnswer: q.correctAnswer || q.correct_answer,
                            explanation: q.explanation,
                        })).filter((q: any) => q.prompt);

                        if (normalizedQuestions.length > 0) {
                            return (
                                <ChatQuizPreview
                                    title={data.title || 'Quiz'}
                                    questions={normalizedQuestions}
                                    difficulty={data.difficulty}
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
                    className="text-primary hover:text-primary/80 underline underline-offset-2"
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noopener noreferrer' : undefined}
                    {...props}
                >
                    {children}
                </a>
            );
        },

        // Tables - Hybrid Premium (DeepSeek/Claude inspired)
        table({ children, ...props }: any) {
            return (
                <TableContext.Provider value={true}>
                    <div className="my-8 w-full overflow-hidden rounded-lg border border-border bg-white/[0.01]">
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
                <thead className="border-b border-border bg-white/[0.01]" {...props}>
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
                    className="group transition-colors hover:bg-muted/50"
                    {...props}
                >
                    {children}
                </tr>
            );
        },

        th({ children, ...props }: any) {
            return (
                <th
                    className="py-3 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground select-none align-top whitespace-nowrap"
                    {...props}
                >
                    {children}
                </th>
            );
        },

        td({ children, ...props }: any) {
            return (
                <td
                    className="py-3 px-4 align-top text-foreground/80 leading-relaxed min-w-[120px] first:font-medium first:text-foreground/70"
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
                    className="border-l-4 border-primary/50 pl-4 my-4 text-muted-foreground italic"
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
                <li className="text-foreground/80" {...props}>
                    {children}
                </li>
            );
        },

        // Headings
        h1({ children, ...props }: any) {
            return (
                <h1 className="text-2xl font-bold mt-6 mb-3 text-foreground" {...props}>
                    {children}
                </h1>
            );
        },

        h2({ children, ...props }: any) {
            return (
                <h2 className="text-xl font-semibold mt-5 mb-2 text-foreground" {...props}>
                    {children}
                </h2>
            );
        },

        h3({ children, ...props }: any) {
            return (
                <h3 className="text-lg font-medium mt-4 mb-2 text-foreground" {...props}>
                    {children}
                </h3>
            );
        },

        h4({ children, ...props }: any) {
            return (
                <h4 className="text-base font-medium mt-3 mb-1.5 text-foreground/70" {...props}>
                    {children}
                </h4>
            );
        },

        // Paragraphs
        p({ children, ...props }: any) {
            return (
                <p className="my-2 leading-relaxed text-foreground/80" {...props}>
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
                <strong className="font-semibold text-foreground" {...props}>
                    {children}
                </strong>
            );
        },

        // Emphasis/Italic
        em({ children, ...props }: any) {
            return (
                <em className="italic text-foreground/80" {...props}>
                    {children}
                </em>
            );
        },
    }), [onCodeBlock, onLink, sources, ragCitations]);

    return (
        <div className={cn('prose prose-invert prose-zinc max-w-none', className)}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeRaw, rehypeKatex]}
                components={components}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownRenderer;
