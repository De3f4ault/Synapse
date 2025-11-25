/**
 * CodeBlock - Syntax highlighted code
 * Uses Prism.js with copy button
 */

import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
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
    <div className="my-4 rounded-lg overflow-hidden border border-medium bg-darker">
    {/* Header */}
    <div className="flex items-center justify-between px-4 py-2 bg-darker/50 border-b border-medium">
    <span className="text-xs font-mono text-white/60 uppercase">
    {language}
    </span>
    <button
    onClick={handleCopy}
    className={cn(
      'flex items-center gap-2 px-2.5 py-1.5 rounded-md',
      'text-xs font-medium',
      'transition-colors duration-200',
      copied
      ? 'bg-green-500/20 text-green-400'
      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
    )}
    >
    <AnimatePresence mode="wait">
    {copied ? (
      <motion.div
      key="check"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className="flex items-center gap-1.5"
      >
      <Check className="w-3.5 h-3.5" />
      <span>Copied!</span>
      </motion.div>
    ) : (
      <motion.div
      key="copy"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className="flex items-center gap-1.5"
      >
      <Copy className="w-3.5 h-3.5" />
      <span>Copy</span>
      </motion.div>
    )}
    </AnimatePresence>
    </button>
    </div>

    {/* Code Content */}
    <div className="overflow-x-auto">
    <SyntaxHighlighter
    language={language}
    style={vscDarkPlus}
    customStyle={{
      margin: 0,
      padding: '1rem',
      background: 'transparent',
      fontSize: '0.875rem',
      lineHeight: '1.5',
    }}
    showLineNumbers
    lineNumberStyle={{
      minWidth: '3em',
      paddingRight: '1em',
      color: 'rgba(255, 255, 255, 0.3)',
          userSelect: 'none',
    }}
    >
    {code}
    </SyntaxHighlighter>
    </div>
    </div>
  );
};

export default CodeBlock;
