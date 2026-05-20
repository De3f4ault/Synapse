/**
 * TiptapAIBubbleMenu — AI action panel that appears above selected text.
 *
 * @tiptap/react v3 does NOT export BubbleMenu — we implement it manually:
 *  - listen to editor selectionUpdate events
 *  - use window.getSelection().getRangeAt(0).getBoundingClientRect() for
 *    accurate viewport-relative (fixed) positioning
 *  - onMouseDown + e.preventDefault() on all buttons keeps the ProseMirror
 *    selection alive while the user clicks
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import {
  RefreshCw, AlignLeft, ZoomIn, ZoomOut, CheckCircle,
  Languages, Wand2, X, Check, Loader2,
} from 'lucide-react';
import { useNoteAITransform, type TransformAction } from '../hooks/useNoteAITransform';
import './tiptap-ai-bubble.css';

interface TiptapAIBubbleMenuProps {
  editor: Editor | null;
  noteText?: string;
  canvasSummary?: string;
}

interface ActionDef {
  id: TransformAction;
  label: string;
  icon: React.ReactNode;
  opts?: Record<string, string>;
}

const QUICK_ACTIONS: ActionDef[] = [
  { id: 'rewrite',     label: 'Rewrite',   icon: <RefreshCw   size={12} /> },
  { id: 'summarize',   label: 'Summarize', icon: <AlignLeft   size={12} /> },
  { id: 'expand',      label: 'Expand',    icon: <ZoomIn      size={12} /> },
  { id: 'shorten',     label: 'Shorten',   icon: <ZoomOut     size={12} /> },
  { id: 'fix_grammar', label: 'Fix',       icon: <CheckCircle size={12} /> },
  { id: 'translate',   label: 'Translate', icon: <Languages   size={12} />, opts: { language: 'Spanish' } },
];

const BUBBLE_W = 480; // max-width of the bubble in px

export function TiptapAIBubbleMenu({ editor, noteText = '', canvasSummary = '' }: TiptapAIBubbleMenuProps) {
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const customInputRef = useRef<HTMLInputElement>(null);

  const { transform, applyTransform, cancel, reset, isStreaming, streamedText, error } =
    useNoteAITransform({ editor, noteText, canvasSummary });

  // ── Track selection and position the bubble ────────────────────────────────
  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const { from, to } = editor.state.selection;
      if (from === to || showPreview) {
        setBubblePos(null);
        return;
      }

      // Use native selection API for accurate coordinates
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        setBubblePos(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setBubblePos(null);
        return;
      }

      // Centre the bubble above the selection; clamp to viewport edges
      const left = Math.max(8, Math.min(
        rect.left + rect.width / 2 - BUBBLE_W / 2,
        window.innerWidth - BUBBLE_W - 8,
      ));
      const top = Math.max(8, rect.top - 48);

      setBubblePos({ top, left });
    };

    editor.on('selectionUpdate', update);
    editor.on('transaction', update);

    // Hide on blur
    const hide = () => setBubblePos(null);
    editor.on('blur', hide);

    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
      editor.off('blur', hide);
    };
  }, [editor, showPreview]);

  // ── Action handlers ────────────────────────────────────────────────────────
  const handleAction = useCallback(async (action: ActionDef) => {
    setShowPreview(true);
    setShowCustom(false);
    setBubblePos(null); // hide pill while preview is visible
    await transform(action.id, action.opts as any);
  }, [transform]);

  const handleCustomSubmit = useCallback(async () => {
    if (!customPrompt.trim()) return;
    setShowPreview(true);
    setShowCustom(false);
    setBubblePos(null);
    await transform('custom', { customPrompt });
  }, [customPrompt, transform]);

  const handleApply = useCallback(() => {
    applyTransform(streamedText);
    setShowPreview(false);
    reset();
  }, [applyTransform, streamedText, reset]);

  const handleDiscard = useCallback(() => {
    cancel();
    reset();
    setShowPreview(false);
    setShowCustom(false);
  }, [cancel, reset]);

  if (!editor) return null;

  return (
    <>
      {/* ── Floating action row ─────────────────────────────────────────── */}
      {bubblePos && !showPreview && (
        <div
          className="tiptap-ai-bubble"
          style={{ position: 'fixed', top: bubblePos.top, left: bubblePos.left, zIndex: 500 }}
        >
          <span className="tiptap-ai-bubble__label">
            <Wand2 size={11} /> AI
          </span>

          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              className="tiptap-ai-bubble__btn"
              onMouseDown={(e) => { e.preventDefault(); handleAction(action); }}
              title={action.label}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}

          <div className="tiptap-ai-bubble__sep" />

          <button
            className="tiptap-ai-bubble__btn"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowCustom((s) => !s);
              setTimeout(() => customInputRef.current?.focus(), 50);
            }}
            title="Custom instruction"
          >
            <Wand2 size={12} />
            <span>Custom</span>
          </button>

          {showCustom && (
            <div className="tiptap-ai-bubble__custom">
              <input
                ref={customInputRef}
                className="tiptap-ai-bubble__custom-input"
                placeholder="e.g. Make it more academic…"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
              />
              <button
                className="tiptap-ai-bubble__custom-submit"
                onMouseDown={(e) => { e.preventDefault(); handleCustomSubmit(); }}
              >
                Go
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Streaming preview panel ─────────────────────────────────────── */}
      {showPreview && (
        <div className="tiptap-ai-preview">
          <div className="tiptap-ai-preview__header">
            <span className="tiptap-ai-preview__title">
              {isStreaming ? (
                <><Loader2 size={13} className="tiptap-ai-spin" /> Generating…</>
              ) : error ? (
                '⚠ Error'
              ) : (
                '✓ Ready to apply'
              )}
            </span>
            <div className="tiptap-ai-preview__actions">
              {!isStreaming && !error && streamedText && (
                <button className="tiptap-ai-preview__apply-btn" onClick={handleApply}>
                  <Check size={13} /> Apply
                </button>
              )}
              <button className="tiptap-ai-preview__discard-btn" onClick={handleDiscard}>
                <X size={13} /> {isStreaming ? 'Stop' : 'Discard'}
              </button>
            </div>
          </div>

          <div className="tiptap-ai-preview__body">
            {error ? (
              <span style={{ color: 'var(--status-error)' }}>{error}</span>
            ) : (
              <span>
                {streamedText}
                {isStreaming && <span className="tiptap-ai-cursor" />}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
