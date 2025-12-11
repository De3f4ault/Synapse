/**
 * WelcomeScreen - Exact NotebookLM Replica
 * Pixel-perfect empty state matching Google's NotebookLM
 *
 * Location: frontend/src/pages/chat/components/main-area/WelcomeScreen.tsx
 */

import React from 'react';
import { Upload, Sparkles, FileQuestion, BookOpen } from 'lucide-react';

interface WelcomeScreenProps {
  onAddSource: () => void;
  onPromptClick?: (prompt: string) => void;
  className?: string;
}

const suggestions = [
  { text: 'Summarize key concepts', icon: Sparkles },
  { text: 'Explain complex topics', icon: FileQuestion },
  { text: 'Generate study guide', icon: BookOpen },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onAddSource,
  onPromptClick,
  className,
}) => {
  return (
    <div className={`empty-state h-full ${className || ''}`}>
      {/* Upload Icon */}
      <div className="empty-state-icon mb-6 p-4 rounded-full bg-[var(--synapse-bg-tertiary)] text-[var(--synapse-blue)]">
        <Upload size={24} />
      </div>

      {/* Title */}
      <h2 className="empty-state-title mb-3">
        Add a source to get started
      </h2>

      {/* Description */}
      <p className="empty-state-text mb-8">
        Upload a source
      </p>

      {/* Upload Button */}
      <button
        onClick={onAddSource}
        className="synapse-button bg-[var(--synapse-bg-primary)] hover:bg-[var(--synapse-panel-hover)] rounded-full px-6 py-2 border border-[var(--synapse-border-medium)] flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-wider"
      >
        <Upload size={16} />
        <span>Upload source</span>
      </button>

      {/* Suggestion Chips */}
      {onPromptClick && (
        <div className="mt-12 flex flex-wrap justify-center gap-2 max-w-xl">
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              onClick={() => onPromptClick(item.text)}
              className="notebook-chip hover:bg-[var(--notebook-panel-hover)] transition-colors cursor-pointer"
            >
              <item.icon size={14} />
              <span>{item.text}</span>
            </button>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-16">
        <p className="text-xs text-[var(--text-tertiary)]">
          Powered by Google AI
        </p>
      </div>
    </div>
  );
};

export default WelcomeScreen;
