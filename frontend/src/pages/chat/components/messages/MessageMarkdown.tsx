/**
 * MessageMarkdown - DeepSeek-style markdown rendering
 * Beautiful tables, code blocks, all formatting
 *
 * Location: src/pages/chat/components/messages/MessageMarkdown.tsx
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
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
    <div className={cn('message-markdown', className)}>
    <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      // Code blocks with syntax highlighting
      code({ node, inline, className, children, ...props }) {
        const [copied, setCopied] = React.useState(false);
        const match = /language-(\w+)/.exec(className || '');
        const language = match ? match[1] : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && language) {
    return (
      <div className="relative group my-4">
      {/* Header with language + copy button */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#2C2C2E] border border-[#3F3F46] border-b-0 rounded-t-[16px]">
      <span className="text-xs text-white/60 font-mono uppercase">
      {language}
      </span>
      <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-[#3F3F46] text-white/60 hover:text-white transition-all text-xs"
      >
      {copied ? (
        <>
        <Check className="w-3 h-3" />
        Copied
        </>
      ) : (
        <>
        <Copy className="w-3 h-3" />
        Copy
        </>
      )}
      </button>
      </div>

      {/* Code content */}
      <div className="rounded-b-[16px] overflow-hidden border border-[#3F3F46]">
      <SyntaxHighlighter
      style={vscDarkPlus}
      language={language}
      PreTag="div"
      customStyle={{
        margin: 0,
        padding: '1rem',
        background: '#2C2C2E',
        fontSize: '13px',
        lineHeight: '1.6',
      }}
      {...props}
      >
      {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
      </div>
      </div>
    );
  }

  // Inline code
  return (
    <code
    className="px-2 py-0.5 rounded-md bg-[#2C2C2E] text-[#5685FE] text-sm font-mono border border-[#3F3F46]"
    {...props}
    >
    {children}
    </code>
  );
      },

      // Tables - DeepSeek beautiful style
      table({ children }) {
        return (
          <div className="my-4 overflow-x-auto rounded-[16px] border border-[#3F3F46]">
          <table className="w-full border-collapse">
          {children}
          </table>
          </div>
        );
      },

      thead({ children }) {
        return (
          <thead className="bg-[#2C2C2E]">
          {children}
          </thead>
        );
      },

      th({ children }) {
        return (
          <th className="px-4 py-3 text-left text-sm font-medium text-white/90 border-b border-[#3F3F46]">
          {children}
          </th>
        );
      },

      td({ children }) {
        return (
          <td className="px-4 py-3 text-sm text-white/80 border-b border-[#3F3F46] last:border-b-0">
          {children}
          </td>
        );
      },

      tbody({ children }) {
        return (
          <tbody className="bg-[#151517]">
          {children}
          </tbody>
        );
      },

      // Lists
      ul({ children }) {
        return (
          <ul className="my-2 ml-5 space-y-1.5 list-disc marker:text-white/40">
          {children}
          </ul>
        );
      },

      ol({ children }) {
        return (
          <ol className="my-2 ml-5 space-y-1.5 list-decimal marker:text-white/40">
          {children}
          </ol>
        );
      },

      li({ children }) {
        return (
          <li className="text-white/80 text-[15px] leading-relaxed">
          {children}
          </li>
        );
      },

      // Links
      a({ href, children }) {
        return (
          <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#5685FE] hover:underline transition-colors"
          >
          {children}
          </a>
        );
      },

      // Paragraphs
      p({ children }) {
        return (
          <p className="text-white/80 text-[15px] leading-relaxed mb-4 last:mb-0">
          {children}
          </p>
        );
      },

      // Headings
      h1({ children }) {
        return (
          <h1 className="text-2xl font-semibold text-white mb-4 mt-6">
          {children}
          </h1>
        );
      },

      h2({ children }) {
        return (
          <h2 className="text-xl font-semibold text-white mb-3 mt-5">
          {children}
          </h2>
        );
      },

      h3({ children }) {
        return (
          <h3 className="text-lg font-semibold text-white mb-2 mt-4">
          {children}
          </h3>
        );
      },

      // Blockquotes
      blockquote({ children }) {
        return (
          <blockquote className="my-4 pl-4 border-l-2 border-[#5685FE] text-white/70 italic">
          {children}
          </blockquote>
        );
      },

      // Horizontal rule
      hr() {
        return <hr className="my-6 border-t border-[#3F3F46]" />;
      },

      // Strong (bold)
      strong({ children }) {
        return (
          <strong className="font-semibold text-white">
          {children}
          </strong>
        );
      },

      // Emphasis (italic)
      em({ children }) {
        return (
          <em className="italic text-white/90">
          {children}
          </em>
        );
      },
    }}
    >
    {content}
    </ReactMarkdown>
    </div>
  );
};

export default MessageMarkdown;
