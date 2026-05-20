/**
 * ArtifactDataPartRenderer
 *
 * Renders SDK `DataUIPart` artifacts that arrive via the Vercel AI SDK's
 * `data-artifact` stream parts. Bridges the SDK data system to existing
 * Synapse artifact components.
 *
 * SDK emits:  message.parts[n] = { type: 'data-artifact', data: ArtifactDataPart }
 * This maps:  artifact_type → ChatFlashcardSet | ChatQuizPreview | ArtifactCard
 */

import { Loader2 } from 'lucide-react';
import { ChatFlashcardSet } from './ChatFlashcardSet';
import { ChatQuizPreview } from './ChatQuizPreview';
import { ArtifactCard } from '../../artifacts/components/ArtifactCard';
import type { ArtifactDataPart } from '../schemas/dataPartSchemas';
import type { ArtifactType } from '@/shared/rendering/schema';
import type { FlashcardCardPreview, QuizQuestionPreview } from '@/shared/rendering/schema';

interface ArtifactDataPartRendererProps {
  data: ArtifactDataPart;
  messageId: number;
  sessionId: number;
}

/**
 * Map our streaming artifact_type → the rendering schema's MIME-based ArtifactType
 */
const ARTIFACT_TYPE_MAP: Record<string, ArtifactType> = {
  code: 'application/vnd.ant.code',
  react: 'application/vnd.ant.react',
  html: 'text/html',
  markdown: 'text/markdown',
};

export function ArtifactDataPartRenderer({
  data,
  messageId: _messageId,
  sessionId: _sessionId,
}: ArtifactDataPartRendererProps) {
  // ── Loading state ─────────────────────────────────────────────────────
  if (data.state === 'creating' || data.state === 'streaming') {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
        <Loader2 className="size-4 animate-spin" />
        <span>
          Generating {data.artifact_type === 'flashcard_set' ? 'flashcards' : data.artifact_type}…
        </span>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────
  if (data.state === 'error') {
    return (
      <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
        Failed to generate {data.title || 'artifact'}
      </div>
    );
  }

  // ── Flashcard Set ─────────────────────────────────────────────────────
  if (data.artifact_type === 'flashcard_set') {
    const payload = data.payload as {
      cards?: FlashcardCardPreview[];
    } | undefined;

    if (!payload?.cards?.length) return null;

    return (
      <div className="mt-3">
        <ChatFlashcardSet
          title={data.title || 'Flashcard Set'}
          cards={payload.cards}
        />
      </div>
    );
  }

  // ── Quiz ──────────────────────────────────────────────────────────────
  if (data.artifact_type === 'quiz') {
    const payload = data.payload as {
      questions?: QuizQuestionPreview[];
      difficulty?: string;
    } | undefined;

    if (!payload?.questions?.length) return null;

    return (
      <div className="mt-3">
        <ChatQuizPreview
          title={data.title || 'Quiz'}
          questions={payload.questions}
          difficulty={payload.difficulty as any}
        />
      </div>
    );
  }

  // ── Code / React / HTML / Markdown → ArtifactCard ─────────────────────
  if (['code', 'react', 'html', 'markdown'].includes(data.artifact_type)) {
    if (!data.content) return null;

    const artifactType = ARTIFACT_TYPE_MAP[data.artifact_type] || 'application/vnd.ant.code';

    return (
      <div className="mt-3">
        <ArtifactCard
          artifact={{
            type: 'artifact',
            artifactId: data.id,
            artifactType,
            title: data.title || 'Code',
            language: data.language ?? undefined,
            content: data.content,
          }}
        />
      </div>
    );
  }

  return null;
}
