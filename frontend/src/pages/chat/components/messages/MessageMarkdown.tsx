/**
 * MessageMarkdown - Oracle Theme
 * Renders Markdown with Oracle typography and syntax highlighting.
 *
 * Location: chat/components/messages/MessageMarkdown.tsx
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock'; // We will update this next
import { cn } from '@/lib/utils';

interface MessageMarkdownProps {
  content: string;
  className?: string;
}

export const MessageMarkdown: React.FC<MessageMarkdownProps> = ({
  content,
  className,
}) => {
  return (
    <div className={cn('prose prose-invert max-w-none', className)}>
    <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      // Code Blocks
      code({ node, inline, className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || '');
        const language = match ? match[1] : '';

  if (!inline && language) {
    return (
      <CodeBlock
      code={String(children).replace(/\n$/, '')}
      language={language}
      />
    );
  }

  return (
    <code
    className="px-1.5 py-0.5 rounded-sm bg-cyan-950/40 text-cyan-200 text-xs font-mono border border-cyan-500/20"
    {...props}
    >
    {children}
    </code>
  );
      },

      // Headings - Serif font for gravitas
      h1: ({children}) => <h1 className="font-serif text-2xl text-cyan-100 mt-6 mb-4">{children}</h1>,
          h2: ({children}) => <h2 className="font-serif text-xl text-cyan-100 mt-5 mb-3">{children}</h2>,
          h3: ({children}) => <h3 className="font-serif text-lg text-cyan-200 mt-4 mb-2">{children}</h3>,

          // Paragraphs - Slate for readability, slightly distinct from headings
          p: ({children}) => <p className="mb-4 text-cyan-50/90 leading-7 font-sans">{children}</p>,

          // Links
          a: ({href, children}) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline decoration-cyan-500/30 underline-offset-2 transition-colors">
            {children}
            </a>
          ),

          // Lists
          ul: ({children}) => <ul className="list-disc list-outside ml-4 mb-4 text-cyan-50/90 marker:text-cyan-500/50">{children}</ul>,
          ol: ({children}) => <ol className="list-decimal list-outside ml-4 mb-4 text-cyan-50/90 marker:text-cyan-500/50">{children}</ol>,

          // Blockquotes
          blockquote: ({children}) => (
            <blockquote className="border-l-2 border-cyan-500/30 pl-4 my-4 italic text-slate-400 bg-black/20 py-2 pr-2 rounded-r-lg">
            {children}
            </blockquote>
          ),

          // Tables
          table: ({children}) => <div className="overflow-x-auto my-4 rounded-lg border border-white/10"><table className="w-full text-sm text-left">{children}</table></div>,
          thead: ({children}) => <thead className="bg-white/5 text-cyan-200 uppercase font-mono text-xs">{children}</thead>,
          th: ({children}) => <th className="px-4 py-3 font-medium border-b border-white/10">{children}</th>,
          td: ({children}) => <td className="px-4 py-3 border-b border-white/5 text-slate-300">{children}</td>,
    }}
    >
    {content}
    </ReactMarkdown>
    </div>
  );
};

export default MessageMarkdown;
