/**
 * CodeBlock - Syntax Highlighted Code with Copy Button
 *
 * INVARIANT: Stateless, session-agnostic, theme-agnostic.
 * Renders structure, not meaning.
 */

import React, { useState, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
    content: string;
    language?: string;
    filename?: string;
    className?: string;
    showLineNumbers?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
    content,
    language = 'text',
    filename,
    className,
    showLineNumbers = true,
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, [content]);

    // Normalize language name
    const normalizedLang = language.toLowerCase().replace(/^language-/, '');

    return (
        <div className={cn('group relative rounded-lg overflow-hidden not-prose', className)}>
            {/* Header with language/filename and copy button */}
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileCode className="size-4" />
                    <span className="font-mono">
                        {filename || normalizedLang || 'code'}
                    </span>
                </div>

                <button
                    onClick={handleCopy}
                    className={cn(
                        'flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all',
                        copied
                            ? 'bg-accent-olive/20 text-accent-olive'
                            : 'bg-zinc-700 text-foreground/80 hover:bg-zinc-600 hover:text-foreground'
                    )}
                    aria-label={copied ? 'Copied!' : 'Copy code'}
                >
                    {copied ? (
                        <>
                            <Check className="size-3.5" />
                            <span>Copied!</span>
                        </>
                    ) : (
                        <>
                            <Copy className="size-3.5" />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>

            {/* Code content */}
            <SyntaxHighlighter
                language={normalizedLang}
                style={oneDark}
                showLineNumbers={showLineNumbers}
                wrapLongLines={true}
                customStyle={{
                    margin: 0,
                    padding: '1rem',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                    background: '#1e1e1e', // Custom dark background
                }}
                codeTagProps={{
                    style: { background: 'transparent' }
                }}
                lineNumberStyle={{
                    minWidth: '2.5em',
                    paddingRight: '1em',
                    color: '#4b5563',
                    userSelect: 'none',
                }}
            >
                {content.trim()}
            </SyntaxHighlighter>
        </div>
    );
};

export default CodeBlock;
