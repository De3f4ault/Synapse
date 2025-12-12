/**
 * CodeBlock - Oracle Theme
 * Syntax highlighting container with terminal aesthetics.
 *
 * Location: chat/components/messages/CodeBlock.tsx
 */

import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, copyToClipboard } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  language: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(code);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-white/10 bg-[#0A0A0A] shadow-lg">
    {/* Terminal Header */}
    <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
    <div className="flex items-center gap-2">
    <Terminal size={12} className="text-amber-400/80" />
    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
    {language || 'PLAINTEXT'}
    </span>
    </div>

    <button
    onClick={handleCopy}
    className="flex items-center gap-1.5 text-slate-500 hover:text-cyan-400 transition-colors"
    title="Copy Code"
    >
    <AnimatePresence mode="wait">
    {copied ? (
      <motion.div
      key="check"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      >
      <Check size={14} className="text-emerald-500" />
      </motion.div>
    ) : (
      <motion.div
      key="copy"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      >
      <Copy size={14} />
      </motion.div>
    )}
    </AnimatePresence>
    </button>
    </div>

    {/* Code Content */}
    <div className="relative font-mono text-xs md:text-sm">
    <SyntaxHighlighter
    language={language}
    style={vscDarkPlus}
    customStyle={{
      margin: 0,
      padding: '1.5rem',
      background: 'transparent', // Let container bg show through
      lineHeight: '1.6',
    }}
    showLineNumbers={true}
    lineNumberStyle={{
      minWidth: '2.5em',
      paddingRight: '1em',
      color: 'rgba(255, 255, 255, 0.1)',
          textAlign: 'right'
    }}
    >
    {code}
    </SyntaxHighlighter>
    </div>
    </div>
  );
};

export default CodeBlock;
