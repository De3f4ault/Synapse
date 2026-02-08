/**
 * ThinkingPanel — Displays AI reasoning/thinking content
 * 
 * Supports three layouts based on mode configuration:
 * - OFF: Not rendered
 * - COLLAPSED: Inline with expand/collapse button
 * - PANEL: Right-side drawer (controlled by parent)
 * 
 * Uses streamingThinking state from useChatStreaming hook.
 */

import { useState, useEffect, useRef } from 'react';
import './ThinkingPanel.css';

// ==================== TYPES ====================

export type ThinkingLayout = 'off' | 'collapsed' | 'panel';

export interface ThinkingPanelProps {
  /** The thinking/reasoning content */
  content: string;
  /** Whether currently streaming */
  isStreaming?: boolean;
  /** Layout mode from mode configuration */
  layout?: ThinkingLayout;
  /** Thinking duration in milliseconds */
  duration?: number;
  /** Whether panel starts expanded */
  defaultExpanded?: boolean;
  /** Callback when user toggles visibility */
  onToggle?: (isExpanded: boolean) => void;
  /** Model name for display */
  modelName?: string;
}

// ==================== COMPONENT ====================

export function ThinkingPanel({
  content,
  isStreaming = false,
  layout = 'collapsed',
  duration,
  defaultExpanded = false,
  onToggle,
  modelName,
}: ThinkingPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll when streaming
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, isStreaming]);
  
  // Don't render if layout is off or no content
  if (layout === 'off' || !content) {
    return null;
  }
  
  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    onToggle?.(newState);
  };
  
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };
  
  // ==================== RENDER: COLLAPSED ====================
  
  if (layout === 'collapsed') {
    return (
      <div className={`thinking-panel thinking-panel--collapsed ${isStreaming ? 'thinking-panel--streaming' : ''}`}>
        <button 
          className="thinking-panel__toggle"
          onClick={handleToggle}
          aria-expanded={isExpanded}
        >
          <span className="thinking-panel__icon">💭</span>
          <span className="thinking-panel__label">
            {isExpanded ? 'Hide' : 'Show'} Reasoning
          </span>
          {isStreaming && (
            <span className="thinking-panel__indicator" aria-label="Thinking in progress">
              <span className="thinking-panel__dot" />
              <span className="thinking-panel__dot" />
              <span className="thinking-panel__dot" />
            </span>
          )}
          {duration && !isStreaming && (
            <span className="thinking-panel__duration">
              {formatDuration(duration)}
            </span>
          )}
          {modelName && (
            <span className="thinking-panel__model">
              {modelName}
            </span>
          )}
          <span className={`thinking-panel__chevron ${isExpanded ? 'thinking-panel__chevron--expanded' : ''}`}>
            ▼
          </span>
        </button>
        
        {isExpanded && (
          <div 
            ref={contentRef}
            className="thinking-panel__content"
            role="region"
            aria-label="AI reasoning"
          >
            <pre>{content}</pre>
          </div>
        )}
      </div>
    );
  }
  
  // ==================== RENDER: PANEL ====================
  
  // Panel layout - always visible, scrollable
  return (
    <aside className={`thinking-panel thinking-panel--panel ${isStreaming ? 'thinking-panel--streaming' : ''}`}>
      <header className="thinking-panel__header">
        <span className="thinking-panel__icon">💭</span>
        <span className="thinking-panel__title">Reasoning</span>
        {isStreaming && (
          <span className="thinking-panel__indicator" aria-label="Thinking in progress">
            <span className="thinking-panel__dot" />
            <span className="thinking-panel__dot" />
            <span className="thinking-panel__dot" />
          </span>
        )}
        {duration && !isStreaming && (
          <span className="thinking-panel__duration">
            {formatDuration(duration)}
          </span>
        )}
        {modelName && (
          <span className="thinking-panel__model">
            {modelName}
          </span>
        )}
      </header>
      
      <div 
        ref={contentRef}
        className="thinking-panel__content"
        role="region"
        aria-label="AI reasoning"
      >
        <pre>{content}</pre>
      </div>
    </aside>
  );
}

export default ThinkingPanel;
