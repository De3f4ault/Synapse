/**
 * CardTutorPanel — v3
 *
 * Embedded panel. NOT a floating widget.
 * - Fills its parent container (h-full flex flex-col)
 * - No fixed/absolute positioning, no blur, no backdrop
 * - Card context strip always shows Q&A under study
 * - Messages: flex-1 min-h-0 overflow-y-auto (critical — prevents input from being pushed away)
 * - Input: shrink-0 — permanently anchored to bottom
 * - Thinking: <think> tags + reasoning parts parsed and shown via ThinkingPanel
 * - System colors only
 */

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Loader2, AlertCircle, Send, Square, ChevronDown, ChevronUp } from 'lucide-react';
import { useCardTutorChat } from '../hooks/useCardTutorChat';
import MarkdownRenderer from '@/shared/rendering/MarkdownRenderer';
import { ThinkingPanel } from '@/modules/chat/components/ThinkingPanel';
import { cn } from '@/lib/utils';
import type { UIMessage } from 'ai';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CardTutorPanelProps {
  cardId: number | null;
  cardFront?: string | null;
  cardBack?: string | null;
  cardTopic?: string | null;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Thinking parser
// Extract <think>...</think> blocks and reasoning parts from AI messages
// ─────────────────────────────────────────────────────────────────────────────

function parseMessage(msg: UIMessage): { displayText: string; thinking: string } {
  const parts = (msg.parts as any[]) || [];

  // Vercel AI SDK native reasoning parts (Gemini/Claude)
  const reasoningText = parts
    .filter((p) => p.type === 'reasoning')
    .map((p) => p.reasoning || p.text || '')
    .join('\n\n');

  let displayText = parts
    .filter((p) => p.type === 'text')
    .map((p) => p.text || '')
    .join('') || (msg as any).content || '';

  // Fallback: parse <think>…</think> from text stream
  let thinking = reasoningText;
  if (!thinking) {
    const match = displayText.match(/<think>([\s\S]*?)<\/think>/s);
    if (match) {
      thinking = match[1].trim();
      displayText = displayText.replace(/<think>[\s\S]*?<\/think>/gs, '').trim();
    }
  }

  return { displayText, thinking };
}

// ─────────────────────────────────────────────────────────────────────────────
// Card Context Strip — shows the card being studied at the top
// ─────────────────────────────────────────────────────────────────────────────

function CardContextStrip({
  front,
  back,
}: {
  front?: string | null;
  back?: string | null;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (!front && !back) return null;

  return (
    <div className="shrink-0 border-b border-border bg-card/40">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
      >
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Card Under Study
        </span>
        {collapsed ? (
          <ChevronDown size={12} className="text-muted-foreground" />
        ) : (
          <ChevronUp size={12} className="text-muted-foreground" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-1.5">
              {front && (
                <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                  {front}
                </p>
              )}
              {back && (
                <p className="text-[10px] text-muted-foreground line-clamp-2 leading-snug">
                  {back}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function CardTutorPanel({
  cardId,
  cardFront,
  cardBack,
  cardTopic,
  onClose,
}: CardTutorPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const [localInput, setLocalInput] = useState('');

  const {
    tutorSession,
    isOpeningSession,
    sessionError,
    messages,
    status,
    stop,
    sendMessage,
    setInput,
    closeTutor,
  } = useCardTutorChat({ cardId, onClose });

  const isStreaming = status === 'streaming' || status === 'submitted';

  const handleInputChange = (v: string) => {
    setLocalInput(v);
    setInput(v);
  };

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel is ready
  useEffect(() => {
    if (cardId && !isOpeningSession) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [cardId, isOpeningSession]);

  const handleClose = () => {
    closeTutor();
    onClose();
  };

  const handleSubmit = () => {
    const text = localInput.trim();
    if (!text || isOpeningSession || isStreaming) return;
    sendMessage({ text });
    setLocalInput('');
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Return nothing when closed — parent handles AnimatePresence
  if (!cardId) return null;

  return (
    <div className="h-full flex flex-col bg-background">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <BookOpen size={13} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-muted-foreground leading-none mb-0.5">
              Card Tutor
            </p>
            <p className="text-xs font-semibold text-foreground truncate max-w-[180px] leading-none">
              {tutorSession?.topic ?? cardTopic ?? '…'}
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Close tutor"
        >
          <X size={15} />
        </button>
      </div>

      {/* ── Card context strip ───────────────────────────────────────────────── */}
      <CardContextStrip front={cardFront} back={cardBack} />

      {/* ── Messages ────────────────────────────────────────────────────────── */}
      {/* CRITICAL: flex-1 min-h-0 — without min-h-0 the div can overflow the
          flex parent and the input gets pushed out of view */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">

        {/* Loading */}
        {isOpeningSession && (
          <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-xs">Opening tutor…</span>
          </div>
        )}

        {/* Error */}
        {sessionError && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium">Failed to open tutor</p>
              <p className="text-[10px] mt-0.5 opacity-75">{sessionError}</p>
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg) => {
          // Divider pseudo-message
          const rawText = (msg.parts as any[])
            ?.filter((p: any) => p.type === 'text')
            .map((p: any) => p.text)
            .join('') || (msg as any).content || '';

          if (rawText === '---divider---') {
            return (
              <div key={msg.id} className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-muted-foreground/50 shrink-0">
                  Previous session
                </span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
            );
          }

          const isAssistant = msg.role === 'assistant';
          const { displayText, thinking } = parseMessage(msg);

          return (
            <div key={msg.id} className={cn('flex gap-2', isAssistant ? 'justify-start' : 'justify-end')}>
              {isAssistant && (
                <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
                  <BookOpen size={10} className="text-primary" />
                </div>
              )}

              <div className={cn(
                'max-w-[88%] space-y-1.5',
                isAssistant ? '' : 'items-end flex flex-col',
              )}>
                {/* Thinking panel — collapsed by default */}
                {isAssistant && thinking && (
                  <ThinkingPanel
                    content={thinking}
                    layout="collapsed"
                    isStreaming={isStreaming}
                  />
                )}

                {/* Message bubble */}
                {displayText && (
                  <div className={cn(
                    'rounded-2xl px-3.5 py-2.5 text-sm',
                    isAssistant
                      ? 'bg-card border border-border/60 text-foreground rounded-tl-sm'
                      : 'bg-primary text-primary-foreground rounded-tr-sm',
                  )}>
                    {isAssistant ? (
                      <MarkdownRenderer
                        content={displayText}
                        className="text-xs [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_pre]:text-[10px] [&_code]:bg-background/60 [&_code]:px-1 [&_code]:rounded"
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-xs leading-relaxed">{displayText}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <BookOpen size={10} className="text-primary" />
            </div>
            <div className="flex gap-1 items-center bg-card border border-border rounded-2xl rounded-tl-sm px-3.5 py-2.5">
              <span className="w-1 h-1 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
              <span className="w-1 h-1 rounded-full bg-primary/60 animate-bounce [animation-delay:130ms]" />
              <span className="w-1 h-1 rounded-full bg-primary/60 animate-bounce [animation-delay:260ms]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Deck pill ────────────────────────────────────────────────────────── */}
      {tutorSession?.deck_name && (
        <div className="px-4 pb-1 shrink-0">
          <span className="inline-flex items-center gap-1 text-[9px] font-mono text-muted-foreground bg-muted/40 border border-border rounded-full px-2 py-0.5">
            <span className="w-1 h-1 rounded-full bg-primary/50" />
            {tutorSession.deck_name}
          </span>
        </div>
      )}

      {/* ── Input — shrink-0 keeps it permanently visible ───────────────────── */}
      <div className="shrink-0 px-3 py-3 border-t border-border">
        <div className="flex items-end gap-2 bg-card border border-border rounded-xl px-3 py-2 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/15 transition-all">
          <textarea
            ref={inputRef}
            rows={1}
            value={localInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a follow-up question…"
            disabled={isOpeningSession || !!sessionError}
            className="flex-1 resize-none bg-transparent outline-none text-xs placeholder:text-muted-foreground/50 text-foreground max-h-24 min-h-[20px] leading-relaxed disabled:opacity-50"
            style={{ fieldSizing: 'content' } as any}
          />

          {isStreaming ? (
            <button
              type="button"
              onClick={stop}
              className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors shrink-0"
              title="Stop generation"
            >
              <Square size={11} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!localInput.trim() || isOpeningSession}
              className={cn(
                'p-1.5 rounded-lg transition-colors shrink-0',
                localInput.trim() && !isOpeningSession
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'text-muted-foreground/40 cursor-not-allowed',
              )}
            >
              <Send size={11} />
            </button>
          )}
        </div>
        <p className="text-[9px] text-muted-foreground/40 text-center mt-1.5 tracking-wide">
          ↵ Send · Shift+↵ New line ·{' '}
          {tutorSession?.is_new ? 'New session' : 'Continued session'}
        </p>
      </div>
    </div>
  );
}
