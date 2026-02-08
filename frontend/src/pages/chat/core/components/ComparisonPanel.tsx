/**
 * ComparisonPanel — Side-by-side dual model response view
 * 
 * Displays streaming responses from two AI models in parallel columns.
 * Inspired by Qwen's model comparison interface.
 */

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import './ComparisonPanel.css';

export interface ComparisonPanelProps {
  /** Model A response content */
  contentA: string;
  /** Model B response content */
  contentB: string;
  /** Model A identifier */
  modelA: string;
  /** Model B identifier */
  modelB: string;
  /** Is Model A still streaming? */
  isStreamingA: boolean;
  /** Is Model B still streaming? */
  isStreamingB: boolean;
  /** Model A thinking content (optional) */
  thinkingA?: string;
  /** Model B thinking content (optional) */
  thinkingB?: string;
}

// Model display names
const MODEL_NAMES: Record<string, string> = {
  qwen3_next: 'Qwen3-Next',
  deepseek_v3_1: 'DeepSeek-V3.1',
  qwen3_vl: 'Qwen3-VL-235B',
  gemini_flash: 'Gemini Flash',
  gemini_pro: 'Gemini Pro',
};

const getModelName = (modelId: string) => MODEL_NAMES[modelId] || modelId;

export function ComparisonPanel({
  contentA,
  contentB,
  modelA,
  modelB,
  isStreamingA,
  isStreamingB,
}: ComparisonPanelProps) {
  const scrollRefA = useRef<HTMLDivElement>(null);
  const scrollRefB = useRef<HTMLDivElement>(null);
  
  // Auto-scroll when streaming
  useEffect(() => {
    if (isStreamingA && scrollRefA.current) {
      scrollRefA.current.scrollTop = scrollRefA.current.scrollHeight;
    }
  }, [contentA, isStreamingA]);
  
  useEffect(() => {
    if (isStreamingB && scrollRefB.current) {
      scrollRefB.current.scrollTop = scrollRefB.current.scrollHeight;
    }
  }, [contentB, isStreamingB]);
  
  return (
    <div className="comparison-panel">
      {/* Model A Column */}
      <div className="comparison-panel__column">
        <header className="comparison-panel__header">
          <span className="comparison-panel__model-name">{getModelName(modelA)}</span>
          {isStreamingA && (
            <span className="comparison-panel__streaming">
              <Loader2 className="comparison-panel__spinner" size={14} />
              <span>Generating...</span>
            </span>
          )}
        </header>
        <div ref={scrollRefA} className="comparison-panel__content">
          {contentA ? (
            <div className="comparison-panel__text">{contentA}</div>
          ) : (
            <div className="comparison-panel__empty">
              {isStreamingA ? 'Waiting for response...' : 'No response yet'}
            </div>
          )}
        </div>
      </div>
      
      {/* Divider */}
      <div className="comparison-panel__divider" />
      
      {/* Model B Column */}
      <div className="comparison-panel__column">
        <header className="comparison-panel__header">
          <span className="comparison-panel__model-name">{getModelName(modelB)}</span>
          {isStreamingB && (
            <span className="comparison-panel__streaming">
              <Loader2 className="comparison-panel__spinner" size={14} />
              <span>Generating...</span>
            </span>
          )}
        </header>
        <div ref={scrollRefB} className="comparison-panel__content">
          {contentB ? (
            <div className="comparison-panel__text">{contentB}</div>
          ) : (
            <div className="comparison-panel__empty">
              {isStreamingB ? 'Waiting for response...' : 'No response yet'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ComparisonPanel;
