/**
 * ThinkingDrawer — Qwen-style right-side thinking panel with animation
 * 
 * A slide-in drawer that displays AI reasoning/thinking content.
 * Inspired by Qwen Chat's "Thinking completed" dropdown on the right side.
 */

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, ChevronRight } from 'lucide-react';
import './ThinkingDrawer.css';

export interface ThinkingDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Callback to close the drawer */
  onClose: () => void;
  /** The thinking/reasoning content */
  content: string;
  /** Whether currently streaming */
  isStreaming?: boolean;
  /** Model name for display */
  modelName?: string;
  /** Thinking duration in milliseconds */
  duration?: number;
}

export function ThinkingDrawer({
  isOpen,
  onClose,
  content,
  isStreaming = false,
  modelName,
  duration,
}: ThinkingDrawerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll when streaming
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, isStreaming]);
  
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="thinking-drawer__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Drawer */}
          <motion.aside
            className="thinking-drawer"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <header className="thinking-drawer__header">
              <div className="thinking-drawer__title-group">
                <Brain className="thinking-drawer__icon" />
                <span className="thinking-drawer__title">
                  {isStreaming ? 'Thinking...' : 'Thinking completed'}
                </span>
                {isStreaming && (
                  <span className="thinking-drawer__indicator">
                    <span className="thinking-drawer__dot" />
                    <span className="thinking-drawer__dot" />
                    <span className="thinking-drawer__dot" />
                  </span>
                )}
              </div>
              
              <div className="thinking-drawer__meta">
                {modelName && (
                  <span className="thinking-drawer__model">{modelName}</span>
                )}
                {duration && !isStreaming && (
                  <span className="thinking-drawer__duration">
                    {formatDuration(duration)}
                  </span>
                )}
                <button
                  className="thinking-drawer__close"
                  onClick={onClose}
                  aria-label="Close thinking panel"
                >
                  <X size={18} />
                </button>
              </div>
            </header>
            
            {/* Content */}
            <div
              ref={contentRef}
              className="thinking-drawer__content"
              role="region"
              aria-label="AI reasoning"
            >
              {content ? (
                <pre className="thinking-drawer__text">{content}</pre>
              ) : (
                <div className="thinking-drawer__empty">
                  <Brain size={32} />
                  <p>AI is thinking about your question...</p>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Compact toggle button to show when drawer is closed
 */
export function ThinkingDrawerToggle({
  onClick,
  hasContent,
  isStreaming,
}: {
  onClick: () => void;
  hasContent: boolean;
  isStreaming?: boolean;
}) {
  if (!hasContent && !isStreaming) return null;
  
  return (
    <button
      className="thinking-drawer-toggle"
      onClick={onClick}
      aria-label="Show thinking process"
    >
      <Brain size={16} />
      <span>{isStreaming ? 'Thinking...' : 'View reasoning'}</span>
      <ChevronRight size={14} />
    </button>
  );
}

export default ThinkingDrawer;
