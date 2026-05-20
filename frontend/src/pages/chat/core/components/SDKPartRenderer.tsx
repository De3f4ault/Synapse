/**
 * SDKPartRenderer — Unified renderer for Vercel AI SDK UIMessage parts
 *
 * Renders ALL non-text, non-reasoning parts from UIMessage.parts:
 *
 *   data-mermaid   → MermaidBlock (live diagram)
 *   data-artifact  → ChatFlashcardSet / ChatQuizPreview / ArtifactCard
 *   source-url     → (handled by MarkdownRenderer inline citations)
 *
 * Usage:
 *   <SDKPartRenderer parts={message.parts} messageId={message.id} />
 *
 * This replaces ArtifactDataPartRenderer and is the single rendering entry
 * point for all structured SDK stream output. TextParts and ReasoningParts
 * are handled separately by MarkdownRenderer / ThinkingBlock.
 */

import type { UIMessagePart, UIDataTypes, UITools } from 'ai';
import { MermaidBlock } from '@/shared/rendering/components/MermaidBlock';
import { ChatFlashcardSet } from './ChatFlashcardSet';
import { ChatQuizPreview } from './ChatQuizPreview';
import { ArtifactCard } from '../../artifacts/components/ArtifactCard';
import { FlashcardsService, QuizzesService } from '@/api/generated';
import { QuizDifficulty, QuestionType } from '@/modules/quizzes/core/types';
import type { FlashcardCardPreview } from '@/shared/rendering/schema';
import { toast } from 'sonner';

interface SDKPartRendererProps {
  parts: UIMessagePart<UIDataTypes, UITools>[];
  /** DB message ID (for save callbacks) */
  messageId?: number;
  /** DB session ID (for save callbacks) */
  sessionId?: number;
}

export function SDKPartRenderer({ parts, messageId: _messageId, sessionId: _sessionId }: SDKPartRendererProps) {
  // Filter to only the parts we render here (skip text, reasoning, source-url)
  const renderableParts = parts.filter(
    (p) =>
      p.type === 'data-mermaid' ||
      p.type === 'data-artifact' ||
      p.type === 'data-model-upgrade' ||
      p.type === 'data-fallback' ||
      p.type === 'data-warning'
  );

  if (renderableParts.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 mt-2 w-full">
      {renderableParts.map((part, i) => (
        <PartSwitch key={(part as any).data?.id ?? i} part={part as any} />
      ))}
    </div>
  );
}

// ── Part dispatcher ──────────────────────────────────────────────────────────

function PartSwitch({ part }: { part: any }) {
  if (part.type === 'data-mermaid') {
    return <MermaidDiagramPart data={part.data} />;
  }
  if (part.type === 'data-artifact') {
    return <ArtifactPart data={part.data} />;
  }
  if (part.type === 'data-model-upgrade') {
    return <ModelUpgradeNotice data={part.data} />;
  }
  if (part.type === 'data-fallback') {
    return <FallbackNotice data={part.data} />;
  }
  if (part.type === 'data-warning') {
    return <WarningNotice data={part.data} />;
  }
  return null;
}

// ── Inline status notices ────────────────────────────────────────────────────
// Soft, non-disruptive notices that appear inline within the message flow.
// Designed to inform without interrupting — no modals, no toasts.

function ModelUpgradeNotice({ data }: { data: { original_model?: string; upgraded_to?: string; reason?: string } }) {
  return (
    <div className="flex items-start gap-2.5 text-xs text-muted-foreground bg-primary/5 border border-primary/10 rounded-lg px-3 py-2 my-1">
      <span className="shrink-0 mt-px">🔄</span>
      <span>
        {data.reason || (
          <>Switched from <code className="font-mono text-[11px] bg-muted/50 px-1 rounded">{data.original_model}</code> to <code className="font-mono text-[11px] bg-muted/50 px-1 rounded">{data.upgraded_to}</code></>
        )}
      </span>
    </div>
  );
}

function FallbackNotice({ data }: { data: { original_model?: string; fallback_model?: string; reason?: string } }) {
  return (
    <div className="flex items-start gap-2.5 text-xs text-muted-foreground bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2 my-1">
      <span className="shrink-0 mt-px">⚡</span>
      <span>
        {data.reason || (
          <>Switched to <code className="font-mono text-[11px] bg-muted/50 px-1 rounded">{data.fallback_model}</code> for faster response</>
        )}
      </span>
    </div>
  );
}

function WarningNotice({ data }: { data: { message?: string } }) {
  if (!data.message) return null;
  return (
    <div className="flex items-start gap-2.5 text-xs text-muted-foreground bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2 my-1">
      <span className="shrink-0 mt-px">⚠️</span>
      <span>{data.message}</span>
    </div>
  );
}

// ── Mermaid diagram ──────────────────────────────────────────────────────────

function MermaidDiagramPart({ data }: { data: { id: string; diagram: string } }) {
  return (
    <div className="w-full rounded-xl border border-border bg-background/50 p-4">
      <MermaidBlock content={data.diagram} />
    </div>
  );
}

// ── Artifact (flashcards / quiz / code / etc.) ───────────────────────────────

function ArtifactPart({ data }: { data: any }) {
  const { artifact_type, title, payload, content, language, state } = data;

  // Loading state
  if (state === 'creating' || state === 'streaming') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse py-2">
        <div className="h-4 w-4 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
        Generating {artifact_type === 'flashcard_set' ? 'flashcards' : artifact_type === 'quiz' ? 'quiz' : 'artifact'}…
      </div>
    );
  }

  // Flashcard set
  if (artifact_type === 'flashcard_set' && payload) {
    const cards = normalizeFlashcards(payload);
    if (cards.length > 0) {
      return (
        <ChatFlashcardSet
          title={title || (payload as any)?.title || 'Flashcards'}
          cards={cards}
          onSave={async (savedCards: FlashcardCardPreview[]) => {
            try {
              const deckName = title || `Chat Flashcards (${new Date().toLocaleDateString()})`;
              const deck = await FlashcardsService.createDeckApiV1DecksPost({
                name: deckName,
                description: 'Created from chat conversation',
              });
              await FlashcardsService.importFlashcardsApiV1DecksDeckIdImportPost(deck.id, {
                cards: savedCards.map((c: FlashcardCardPreview) => ({ front: c.front, back: c.back })),
              });
              toast.success(`${savedCards.length} flashcards saved to "${deckName}"!`);
            } catch (err: any) {
              toast.error(err?.message || 'Failed to save flashcards');
            }
          }}
        />
      );
    }
  }

  // Quiz
  if (artifact_type === 'quiz' && payload) {
    const questions = normalizeQuizQuestions(payload);
    if (questions.length > 0) {
      return (
        <ChatQuizPreview
          title={title || payload?.title || 'Quiz'}
          questions={questions}
          difficulty={payload?.difficulty}
          onSave={async (quiz) => {
            try {
              const difficultyMap: Record<string, QuizDifficulty> = {
                easy: QuizDifficulty.EASY,
                medium: QuizDifficulty.MEDIUM,
                hard: QuizDifficulty.HARD,
              };
              const questionsForApi = quiz.questions.map((q) => ({
                question_type: QuestionType.MULTIPLE_CHOICE,
                question_text: q.prompt,
                options: q.options || [],
                correct_answer: q.options?.[q.correctIndex ?? 0] || q.correctAnswer || '',
                explanation: q.explanation,
              }));
              await QuizzesService.createQuizApiV1QuizzesPost({
                title: quiz.title,
                description: 'Created from chat conversation',
                difficulty: difficultyMap[quiz.difficulty || 'medium'] || QuizDifficulty.MEDIUM,
                questions: questionsForApi,
              });
              toast.success(`Quiz "${quiz.title}" saved!`);
            } catch (err: any) {
              toast.error(err?.message || 'Failed to save quiz');
            }
          }}
        />
      );
    }
  }

  // Code / React / HTML / Markdown — render via ArtifactCard schema shape
  if ((artifact_type === 'code' || artifact_type === 'react' || artifact_type === 'html' || artifact_type === 'markdown') && content) {
    const fakeBlock = {
      type: 'artifact' as const,
      sequenceId: 0,
      artifact_type: artifact_type === 'code' ? 'application/vnd.ant.code' :
                     artifact_type === 'react' ? 'application/vnd.ant.react' :
                     artifact_type === 'html' ? 'text/html' : 'text/markdown',
      title: title || 'Artifact',
      content,
      language: language || 'text',
    } as any;
    return (
      <ArtifactCard
        artifact={fakeBlock}
        onExpand={() => {}}
      />
    );
  }

  return null;
}

// ── Normalisation helpers ────────────────────────────────────────────────────

function normalizeFlashcards(payload: any): Array<{ front: string; back: string }> {
  if (!payload) return [];
  const cards = Array.isArray(payload) ? payload : payload.cards;
  if (!Array.isArray(cards)) return [];
  return cards
    .map((c: any) => ({
      front: c.front || c.question || c.term || '',
      back: c.back || c.answer || c.definition || '',
    }))
    .filter((c) => c.front && c.back);
}

function normalizeQuizQuestions(payload: any): any[] {
  if (!payload) return [];
  const questions = Array.isArray(payload) ? payload : payload.questions;
  if (!Array.isArray(questions)) return [];
  return questions
    .map((q: any, idx: number) => ({
      id: q.id || `q${idx + 1}`,
      type: q.type || 'multiple_choice',
      prompt: q.prompt || q.question || '',
      options: Array.isArray(q.options) ? q.options : undefined,
      correctIndex: q.correctIndex ?? q.correct_index,
      correctAnswer: q.correctAnswer || q.correct_answer,
      explanation: q.explanation,
    }))
    .filter((q) => q.prompt);
}
