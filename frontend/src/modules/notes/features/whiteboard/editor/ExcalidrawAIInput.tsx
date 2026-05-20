/**
 * ExcalidrawAIInput — floating AI prompt overlay for the canvas face.
 *
 * Renders a pill-shaped input anchored to the top-right of the canvas area.
 * Typing a prompt and pressing Enter (or clicking "Generate") calls
 * useExcalidrawAI.inject() which fetches a Mermaid diagram and injects it.
 */

import { useState, useRef } from 'react';
import { Wand2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useExcalidrawAI } from '../hooks/useExcalidrawAI';
import './excalidraw-ai-input.css';

interface ExcalidrawAIInputProps {
  apiRef: React.MutableRefObject<any>;
  noteText?: string;
}

const DIAGRAM_TYPES = [
  { value: 'flowchart', label: 'Flowchart' },
  { value: 'mindmap',   label: 'Mind Map' },
  { value: 'sequence',  label: 'Sequence' },
  { value: 'classDiagram', label: 'Class' },
  { value: 'erDiagram',    label: 'ER Diagram' },
];

export function ExcalidrawAIInput({ apiRef, noteText = '' }: ExcalidrawAIInputProps) {
  const [expanded, setExpanded] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [diagramType, setDiagramType] = useState('flowchart');
  const inputRef = useRef<HTMLInputElement>(null);

  const { inject, isGenerating, error } = useExcalidrawAI({ apiRef, noteText });

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    await inject(prompt.trim(), diagramType);
    setPrompt('');
  };

  return (
    <div className="excalidraw-ai-input">
      {/* Collapsed pill */}
      {!expanded ? (
        <button
          className="excalidraw-ai-pill"
          onClick={() => { setExpanded(true); setTimeout(() => inputRef.current?.focus(), 50); }}
          title="Generate diagram with AI"
        >
          <Wand2 size={13} />
          <span>AI Diagram</span>
        </button>
      ) : (
        <div className="excalidraw-ai-panel">
          {/* Header */}
          <div className="excalidraw-ai-panel__header">
            <span className="excalidraw-ai-panel__title">
              <Wand2 size={13} /> Generate Diagram
            </span>
            <button
              className="excalidraw-ai-panel__collapse"
              onClick={() => setExpanded(false)}
              title="Collapse"
            >
              <ChevronDown size={14} />
            </button>
          </div>

          {/* Diagram type selector */}
          <div className="excalidraw-ai-panel__type-row">
            {DIAGRAM_TYPES.map((t) => (
              <button
                key={t.value}
                className={`excalidraw-ai-panel__type-btn ${diagramType === t.value ? 'active' : ''}`}
                onClick={() => setDiagramType(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Prompt input */}
          <div className="excalidraw-ai-panel__input-row">
            <input
              ref={inputRef}
              className="excalidraw-ai-panel__input"
              placeholder="Describe the diagram… (e.g. User auth flow)"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              disabled={isGenerating}
            />
            <button
              className="excalidraw-ai-panel__generate-btn"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              title="Generate (Enter)"
            >
              {isGenerating ? <Loader2 size={13} className="excalidraw-ai-spin" /> : 'Generate'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <p className="excalidraw-ai-panel__error">⚠ {error}</p>
          )}

          {/* Status */}
          {isGenerating && (
            <p className="excalidraw-ai-panel__status">
              Thinking about your diagram…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
