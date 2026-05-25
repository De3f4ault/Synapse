/**
 * ChatMessage — Renders a single UIMessage using native SDK parts.
 *
 * Pure Vercel architecture: iterates message.parts[] for content rendering.
 * No more parseOutput(), no more <think> regex, no more sdkParts prop bridging.
 *
 * DB-specific metadata (attachments, grounding_sources, entities) is stored in
 * message.metadata by useSynapseChat during seeding, and extracted here.
 */

import { memo, useRef, useState, useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import { Copy, Check, RefreshCw, MessageSquarePlus, GitBranch, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { ThinkingBlock } from "./ThinkingBlock";
import { ComparisonPanel } from "./ComparisonPanel";
import { toast } from "sonner";
import { HighlightedText } from "../../search/components/HighlightedText";
import { MarkdownRenderer } from "@/shared/rendering";
import type { RAGCitation } from "./RAGCitationPill";
import { SourcesFooter } from "./SourcesFooter";
import type { GroundingSource } from "../engine/types";
import { MermaidBlock } from "@/shared/rendering/components/MermaidBlock";
import { ChatEntityPreview } from "./ChatEntityPreview";
import { MentionChip } from "./MentionChip";
import { ChatFlashcardSet } from "./ChatFlashcardSet";
import { ChatQuizPreview } from "./ChatQuizPreview";
import { ArtifactCard } from "../../artifacts/components/ArtifactCard";
import { BranchNavigator } from "./BranchNavigator";
import { StreamingStatus } from "./StreamingStatus";
import { useBranchNavigation, useCreateBranch } from "../hooks/useBranches";
import { useRegenerate } from "../hooks/useRegenerate";
import { entityKey } from "@/shared/core/entity";
import { useThreadStore } from "../state/threadStore";

import { FlashcardsService, QuizzesService } from "@/api/generated";
import { QuizDifficulty, QuestionType } from "@/modules/quizzes/core/types";
import type { FlashcardCardPreview, QuizQuestionPreview } from "@/shared/rendering/schema";
import type { UIMessage } from "ai";
import type { SearchOccurrence } from "../../search/types";
import type { EntityIdentity } from "@/shared/core/entity";

// ── Metadata shape stored by useSynapseChat in message.metadata ──────────────

interface SynapseMessageMeta {
  dbId?: number;
  sessionId?: number;
  attachments?: any[];
  groundingSources?: GroundingSource[];
  entities?: EntityIdentity[];
  functionCalls?: any;
}

// ── Props ─────────────────────────────────────────────────────────────────────

// ── Helpers (module-scope) ────────────────────────────────────────────────────

/** Normalise flexible flashcard payload shapes from the backend. */
function normFlashcards(payload: any): Array<{ front: string; back: string }> {
  const cards = Array.isArray(payload) ? payload : payload?.cards;
  if (!Array.isArray(cards)) return [];
  return cards
    .map((c: any) => ({ front: c.front || c.question || c.term || '', back: c.back || c.answer || c.definition || '' }))
    .filter((c) => c.front && c.back);
}

/** Normalise flexible quiz question payload shapes from the backend. */
function normQuizQuestions(payload: any): any[] {
  const questions = Array.isArray(payload) ? payload : payload?.questions;
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

/** Map backend artifact_type string → ArtifactBlock.artifactType MIME */
const ARTIFACT_TYPE_MAP: Record<string, string> = {
  code:     'application/vnd.ant.code',
  react:    'application/vnd.ant.react',
  html:     'text/html',
  markdown: 'text/markdown',
  mermaid:  'application/vnd.ant.mermaid',
};

/** Extract plain text from a UIMessage — works for parts-only and legacy .content */
const getMsgText = (msg: UIMessage): string =>
  msg.parts
    ?.filter((p) => p.type === "text")
    .map((p) => (p as any).text || "")
    .join("") ||
  (msg as any).content ||
  "";

/** Get createdAt from UIMessage safely */
const getMsgDate = (msg: UIMessage): Date | undefined => {
  const raw = (msg as any).createdAt;
  if (!raw) return undefined;
  return raw instanceof Date ? raw : new Date(raw);
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface ChatMessageProps {
  message: UIMessage;
  /** True only for the last message while SDK status is 'streaming' */
  isStreaming?: boolean;
  occurrences?: SearchOccurrence[];
  currentOccurrenceId?: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

const ChatMessageComponent = ({
  message,
  isStreaming = false,
  occurrences = [],
  currentOccurrenceId = null,
}: ChatMessageProps) => {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [savingFlashcards, setSavingFlashcards] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  // Track which attachment document IDs have permanently failed to load
  // so we never retry them and stop the 404 infinite loop.
  const [failedAttachments, setFailedAttachments] = useState<Set<number>>(new Set());
  const handleAttachmentError = (docId: number) => {
    setFailedAttachments((prev) => new Set(prev).add(docId));
  };

  // Latch the last non-empty reasoning text so ThinkingBlock stays visible
  // even if the SDK briefly clears the reasoning part during stream finalization.
  const lastReasoningRef = useRef('');

  // Extract DB-specific metadata stored during seeding
  const meta = message.metadata as SynapseMessageMeta | undefined;
  const dbId = meta?.dbId ?? (parseInt(message.id, 10) || -1);
  const sessionId = meta?.sessionId ?? 0;
  const dbAttachments: any[] = meta?.attachments ?? [];
  const groundingSources: GroundingSource[] = meta?.groundingSources ?? [];
  const entities: EntityIdentity[] = meta?.entities ?? [];
  const comparisonData = !isUser ? meta?.functionCalls?.comparison : null;

  // Attachment helpers
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
  const authToken = useAuthStore((s) => s.token);
  
  const sdkAttachments = ((message as any).experimental_attachments as any[] | undefined)?.map((att: any) => {
    // Name is "Attachment {id}" — parse the doc id from there.
    // We no longer use server URL patterns since we now pass blob: URLs.
    const nameMatch = typeof att === 'object' && att.name
      ? att.name.match(/Attachment (\d+)/)
      : null;
    return {
      document_id: nameMatch ? parseInt(nameMatch[1], 10) : 0,
      content_type: att.contentType || 'image/jpeg',
      filename: att.name || 'Attachment',
      // Store the blob: URL so we can use it for preview during streaming
      // before the DB sync has completed and supplied a server thumbnail URL.
      blobUrl: typeof att.url === 'string' && att.url.startsWith('blob:') ? att.url : undefined,
    };
  }) || [];

  // Deduplicate: DB attachments take priority (they have server URLs).
  // SDK blob attachments fill the gap during streaming.
  const attachments = [
    ...dbAttachments,
    ...sdkAttachments.filter(
      (s: any) => !dbAttachments.some((d: any) => d.document_id === s.document_id)
    ),
  ];

  const imageAttachments = attachments.filter((a: any) => a.content_type?.startsWith("image/"));

  const attachUrl = useMemo(() => {
    const suffix = authToken ? `?token=${encodeURIComponent(authToken)}` : "";
    return {
      file: (docId: number) => `${API_BASE}/api/v1/chat/attachments/${docId}/file${suffix}`,
      thumb: (docId: number) => `${API_BASE}/api/v1/chat/attachments/thumbnail/${docId}${suffix}`,
    };
  }, [API_BASE, authToken]);

  // RAG inline citations — extracted from data-citations parts emitted by vercel_protocol
  // after each RAG tool result. Must live at component level (Rules of Hooks).
  const ragCitations: RAGCitation[] = useMemo(
    () =>
      (message.parts ?? [])
        .filter((p) => p.type === 'data-citations')
        .flatMap((p) => ((p as any).data as RAGCitation[]) || []),
    [message.parts],
  );

  // Backend-measured thinking duration (seconds) from data-thinking-duration part.
  // null means the model is still thinking or didn't think at all.
  const thinkingDurationSeconds: number | null = useMemo(() => {
    const part = (message.parts ?? []).find((p) => p.type === 'data-thinking-duration');
    return part ? ((part as any).data?.seconds ?? null) : null;
  }, [message.parts]);

  // Branch navigation — only for committed assistant messages with a valid DB ID
  const branchNav = useBranchNavigation(
    !isUser && dbId > 0 ? dbId : undefined,
    sessionId,
  );

  const hasHighlights = occurrences.length > 0;

  // ── Copy ──────────────────────────────────────────────────────────────────
  const handleCopy = async () => {
    const text = getMsgText(message);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  // ── Save flashcards ───────────────────────────────────────────────────────
  const handleSaveFlashcards = async (cards: FlashcardCardPreview[], title?: string) => {
    if (savingFlashcards) return;
    setSavingFlashcards(true);
    try {
      const deckName = title || `Chat Flashcards (${new Date().toLocaleDateString()})`;
      const existing = await FlashcardsService.listDecksApiV1DecksGet();
      if (existing.find((d) => d.name === deckName)) {
        toast.error(`Deck "${deckName}" already exists`);
        return;
      }
      const deck = await FlashcardsService.createDeckApiV1DecksPost({
        name: deckName,
        description: "Created from chat conversation",
      });
      await FlashcardsService.importFlashcardsApiV1DecksDeckIdImportPost(deck.id, {
        cards: cards.map((c) => ({ front: c.front, back: c.back })),
      });
      toast.success(`${cards.length} flashcards saved to "${deckName}"!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save flashcards");
    } finally {
      setSavingFlashcards(false);
    }
  };

  // ── Save quiz ─────────────────────────────────────────────────────────────
  const handleSaveQuiz = async (quiz: { title: string; questions: QuizQuestionPreview[]; difficulty?: string }) => {
    if (savingQuiz) return;
    setSavingQuiz(true);
    try {
      const existing = await QuizzesService.listQuizzesApiV1QuizzesGet();
      if (existing.find((q) => q.title === quiz.title)) {
        toast.error(`Quiz "${quiz.title}" already exists`);
        return;
      }
      const diffMap: Record<string, QuizDifficulty> = {
        easy: QuizDifficulty.EASY,
        medium: QuizDifficulty.MEDIUM,
        hard: QuizDifficulty.HARD,
      };
      await QuizzesService.createQuizApiV1QuizzesPost({
        title: quiz.title,
        description: "Created from chat conversation",
        difficulty: diffMap[quiz.difficulty || "medium"] || QuizDifficulty.MEDIUM,
        questions: quiz.questions.map((q) => {
          let correctAnswer = "";
          if (q.correctIndex !== undefined && q.options && q.correctIndex < q.options.length) {
            correctAnswer = q.options[q.correctIndex] ?? "";
          } else if (q.correctAnswer) {
            correctAnswer = q.correctAnswer;
          }
          return {
            question_text: q.prompt,
            question_type: q.type === "true_false" ? QuestionType.TRUE_FALSE : QuestionType.MULTIPLE_CHOICE,
            options: q.options ? { choices: q.options } : null,
            correct_answer: correctAnswer,
            explanation: q.explanation || null,
            points: 1,
          };
        }),
      });
      toast.success(`Quiz "${quiz.title}" saved!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save quiz");
    } finally {
      setSavingQuiz(false);
    }
  };

  // ── Comparison data (from saved function_calls metadata) ──────────────────
  if (comparisonData) {
    return (
      <div data-message-id={dbId} className="w-full">
        <ComparisonPanel
          contentA={comparisonData.model_a?.content || ""}
          contentB={comparisonData.model_b?.content || ""}
          modelA={comparisonData.model_a?.key || ""}
          modelB={comparisonData.model_b?.key || ""}
          isStreamingA={false}
          isStreamingB={false}
        />
      </div>
    );
  }

  // ── User message content ──────────────────────────────────────────────────
  const renderUserContent = () => {
    const textContent = getMsgText(message);

    // Parse @[Title](entity:type:id) mention syntax
    const parts: (string | { isMention: true; title: string; type: string; id: string })[] = [];
    let lastIndex = 0;
    const mentionRegex = /@\[([^\]]+)\]\(entity:([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+)\)/g;
    let match;
    while ((match = mentionRegex.exec(textContent)) !== null) {
      if (match.index > lastIndex) parts.push(textContent.substring(lastIndex, match.index));
      parts.push({ isMention: true, title: match[1]!, type: match[2]!, id: match[3]! });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < textContent.length) parts.push(textContent.substring(lastIndex));

    return (
      <p className="text-sm leading-relaxed whitespace-pre-wrap">
        {parts.map((part, i) =>
          typeof part === "string" ? (
            <span key={i}>{part}</span>
          ) : (
            <MentionChip key={i} title={part.title} type={part.type as any} id={part.id} />
          ),
        )}
      </p>
    );
  };

  // ── Assistant message parts rendering ────────────────────────────────────
  const renderAssistantParts = () => {
    const parts = message.parts ?? [];

    // Fallback: no parts yet (should only happen transiently during first stream tick)
    if (!parts.length) return null;

    // ragCitations is derived at component level (see useMemo above) — no hook here.
    const citations = ragCitations;

    return (
      <div className="text-sm w-full min-w-0 flex flex-col gap-4">
        {parts.map((part, i) => {
          // ── Reasoning (thinking) ──
          if (part.type === "reasoning") {
            const text = (part as any).text || "";
            // Latch: once we've seen reasoning content, keep showing it even if
            // the SDK temporarily clears the part during stream finalization.
            if (text) lastReasoningRef.current = text;
            const effectiveText = lastReasoningRef.current;
            // Use a stable key so ThinkingBlock is never unmounted mid-stream.
            return effectiveText ? (
              <ThinkingBlock
                key="reasoning"
                content={effectiveText}
                isStreaming={isStreaming}
                durationSeconds={thinkingDurationSeconds ?? undefined}
              />
            ) : null;
          }

          // ── Text ──
          if (part.type === "text") {
            const text = (part as any).text || "";
            if (!text) return null;
            if (hasHighlights) {
              return (
                <div key={i} className="text-sm leading-relaxed">
                  <HighlightedText
                    content={text}
                    occurrences={occurrences}
                    currentOccurrenceId={currentOccurrenceId}
                  />
                </div>
              );
            }
            return (
              <MarkdownRenderer
                key={i}
                content={text}
                className="break-words"
                sources={groundingSources.length ? groundingSources : undefined}
                ragCitations={citations.length > 0 ? citations : undefined}
              />
            );
          }

          // ── Data: Flashcard set ──
          if (part.type === "data-flashcard-set") {
            const d = (part as any).data;
            return d ? (
              <ChatFlashcardSet key={i} title={d.title} cards={d.cards} onSave={handleSaveFlashcards} />
            ) : null;
          }

          // ── Data: Quiz ──
          if (part.type === "data-quiz") {
            const d = (part as any).data;
            return d ? (
              <ChatQuizPreview key={i} title={d.title} questions={d.questions} difficulty={d.difficulty} onSave={handleSaveQuiz} />
            ) : null;
          }

          // ── Data: Mermaid ──
          if (part.type === "data-mermaid") {
            const d = (part as any).data;
            // Backend puts the diagram under `diagram`, fallback to `content`
            const diagram = d?.diagram || d?.content;
            return diagram ? <MermaidBlock key={i} content={diagram} /> : null;
          }

          // ── Data: Artifact (Vercel SDK native data-artifact part) ──
          // The backend emits data-artifact for flashcard_set, quiz, code, etc.
          // We dispatch to the right component based on artifact_type.
          if (part.type === "data-artifact") {
            const d = (part as any).data;
            if (!d) return null;
            const { artifact_type, title, payload, content, language, state } = d;

            if (state === 'creating' || state === 'streaming') {
              return (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse py-1">
                  <span className="h-3 w-3 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
                  Generating {artifact_type === 'flashcard_set' ? 'flashcards' : artifact_type === 'quiz' ? 'quiz' : 'artifact'}…
                </div>
              );
            }

            // Flashcard set
            if (artifact_type === 'flashcard_set' && payload) {
              const cards = normFlashcards(payload);
              if (cards.length > 0) {
                return <ChatFlashcardSet key={i} title={title || (payload as any)?.title || 'Flashcards'} cards={cards} onSave={handleSaveFlashcards} />;
              }
            }

            // Quiz
            if (artifact_type === 'quiz' && payload) {
              const questions = normQuizQuestions(payload);
              if (questions.length > 0) {
                return <ChatQuizPreview key={i} title={title || (payload as any)?.title || 'Quiz'} questions={questions} difficulty={(payload as any)?.difficulty} onSave={handleSaveQuiz} />;
              }
            }

            // Code / React / HTML / Markdown / Mermaid artifacts with raw content
            if (content) {
              const block = {
                artifactId: d.id || `art-${i}`,
                artifactType: ARTIFACT_TYPE_MAP[artifact_type] ?? 'application/vnd.ant.code',
                title: title || 'Artifact',
                content: content as string,
                language: language || '',
                sequenceId: i,
              };
              return <ArtifactCard key={i} artifact={block as any} />;
            }

            return null;
          }

          // ── Data: Mention Status ──────────────────────────────────────────────
          // Emitted as the FIRST SSE event when the user's message contained @mentions.
          // UX contract: successful injections are SILENT. Only surface problems.
          //   • resolution_failures → entity not found or ownership mismatch
          //   • budget_overflows    → entity found but token budget was exhausted
          if (part.type === "data-mention-status") {
            const d = (part as any).data;
            if (!d) return null;
            const failures: Array<{ type: string; id: number; title: string }> = d.resolution_failures ?? [];
            const overflows: Array<{ type: string; id: number; title: string }> = d.budget_overflows ?? [];
            if (!failures.length && !overflows.length) return null;

            return (
              <div key={i} className="flex flex-wrap gap-1.5 mb-2">
                {overflows.map((e) => (
                  <span
                    key={`ov-${e.id}`}
                    title={`"${e.title}" was referenced but is too large to fully load into context`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium
                               bg-amber-500/10 text-amber-600 dark:text-amber-400
                               border border-amber-500/20 cursor-default select-none"
                  >
                    <span aria-hidden>📎</span>
                    {e.title} — too large to fully load
                  </span>
                ))}
                {failures.map((e) => (
                  <span
                    key={`fl-${e.id}`}
                    title={`"${e.title}" could not be found or you don't have access`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium
                               bg-destructive/10 text-destructive
                               border border-destructive/20 cursor-default select-none"
                  >
                    <span aria-hidden>⚠</span>
                    {e.title} — not found
                  </span>
                ))}
              </div>
            );
          }

          // ── Source URL (Phase 9 — inline citations) ──
          // For now: accumulated in groundingSources from metadata for DB messages,
          // will become CitationChip parts once backend emits SourceUrlChunk.
          if (part.type === "source-url") return null;

          return null;
        })}

        {/* Streaming status — tiered wait-time messages */}
        {isStreaming && (
          <StreamingStatus
            hasContent={parts.some(
              (p) =>
                (p.type === 'text' && !!(p as any).text) ||
                (p.type === 'reasoning' && !!(p as any).text)
            )}
          />
        )}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      data-message-id={dbId}
      className={cn("flex w-full gap-3", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div className={cn("flex flex-col gap-1", isUser ? "items-end max-w-[70%]" : "items-start max-w-[90%]")}>

        {/* User: image thumbnails above bubble */}
        {isUser && imageAttachments.length > 0 && (
          <div className="flex flex-nowrap gap-2 justify-end overflow-x-auto custom-scrollbar pb-1 max-w-full">
            {imageAttachments.map((att: any, idx: number) => {
              const docId: number = att.document_id;
              if (failedAttachments.has(docId)) {
                return (
                  <div
                    key={docId || idx}
                    title={att.filename || "Attachment unavailable"}
                    className="w-[120px] h-[120px] rounded-xl ring-1 ring-border flex flex-col items-center justify-center gap-1 bg-muted/50 text-muted-foreground"
                  >
                    <span className="text-2xl" aria-hidden>🖼️</span>
                    <span className="text-[10px] text-center px-1 leading-tight opacity-60">Unavailable</span>
                  </div>
                );
              }
              // Use blob URL if we have one (during streaming, before DB sync).
              // Once the DB syncs, dbAttachments populates and the blob is gone.
              const thumbSrc = att.blobUrl ?? attachUrl.thumb(docId);
              return (
                <button
                  key={docId || idx}
                  onClick={() => setLightboxSrc(att.blobUrl ?? attachUrl.file(docId))}
                  className="relative group rounded-xl overflow-hidden ring-1 ring-border hover:ring-primary/50 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <img
                    src={thumbSrc}
                    alt={att.filename || "attachment"}
                    className="w-[120px] h-[120px] object-cover rounded-xl"
                    loading="lazy"
                    onError={() => { if (!att.blobUrl) handleAttachmentError(docId); }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-background/20 transition-colors rounded-xl" />
                </button>
              );
            })}
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={cn(
            "overflow-hidden min-w-0 transition-all duration-200",
            isUser
              ? "rounded-2xl rounded-br-sm px-4 py-2.5 bg-secondary text-secondary-foreground"
              : "px-1 py-2 text-foreground/70",
          )}
        >
          {isUser ? renderUserContent() : renderAssistantParts()}

          {/* Grounding Sources Footer (DB messages — new messages get source-url parts in Phase 9) */}
          {!isUser && !isStreaming && groundingSources.length > 0 && (
            <SourcesFooter sources={groundingSources} />
          )}

          {/* Assistant image attachments below text */}
          {!isUser && imageAttachments.length > 0 && (
            <div className="flex flex-nowrap gap-2 mt-3 overflow-x-auto custom-scrollbar pb-1 max-w-full">
              {imageAttachments.map((att: any, idx: number) => {
                const docId: number = att.document_id;
                if (failedAttachments.has(docId)) {
                  return (
                    <div
                      key={docId || idx}
                      title={att.filename || "Attachment unavailable"}
                      className="max-w-[240px] h-[80px] rounded-lg border border-border flex flex-col items-center justify-center gap-1 bg-muted/50 text-muted-foreground"
                    >
                      <span className="text-2xl" aria-hidden>🖼️</span>
                      <span className="text-[10px] text-center px-2 leading-tight opacity-60">Unavailable</span>
                    </div>
                  );
                }
                return (
                  <button
                    key={docId || idx}
                    onClick={() => setLightboxSrc(attachUrl.file(docId))}
                    className="relative group rounded-lg overflow-hidden border border-border hover:border-primary/40 transition-all"
                  >
                    <img
                      src={attachUrl.file(docId)}
                      alt={att.filename || "attachment"}
                      className="max-w-[240px] max-h-[180px] object-cover rounded-lg"
                      loading="lazy"
                      onError={() => handleAttachmentError(docId)}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-background/50 transition-colors" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Referenced Entities */}
          {entities.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border flex flex-col gap-2 animate-in fade-in slide-in-from-top-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                Referenced Context
              </span>
              {entities.map((ref) => (
                <ChatEntityPreview key={entityKey(ref)} entityRef={ref} />
              ))}
            </div>
          )}
        </div>

        {/* Footer: timestamp + action bar */}
        <div className="flex items-center gap-2 px-1 mt-1.5">
          <span className="text-[10px] text-muted-foreground">
            {(() => {
            const d = getMsgDate(message);
            return d
              ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Just now';
          })()}
          </span>

          {/* Assistant action bar */}
          {!isUser && !isStreaming && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-muted/50 border border-border">
              <button
                onClick={handleCopy}
                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground/80 transition-colors"
                title="Copy"
              >
                {copied ? <Check className="size-3.5 text-accent-olive" /> : <Copy className="size-3.5" />}
              </button>

              {dbId > 0 && <RegenerateButtonInternal messageId={dbId} sessionId={sessionId} />}
              <ThreadButtonInternal sessionId={sessionId} />
              {dbId > 0 && <BranchButtonInternal messageId={dbId} sessionId={sessionId} />}

              {branchNav.hasBranches && (
                <BranchNavigator
                  currentIndex={branchNav.currentIndex}
                  totalBranches={branchNav.totalBranches}
                  onPrev={branchNav.goToPrev}
                  onNext={branchNav.goToNext}
                  compact
                />
              )}
            </div>
          )}

          {/* User message copy */}
          {isUser && !isStreaming && (
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground/80 transition-colors"
              title="Copy message"
            >
              {copied ? <Check className="size-3 text-accent-olive" /> : <Copy className="size-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Image lightbox */}
      <AnimatePresence>
        {lightboxSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setLightboxSrc(null)}
          >
            <button
              onClick={() => setLightboxSrc(null)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-foreground/10 text-foreground hover:bg-foreground/15 transition-colors z-10"
            >
              <X className="size-5" />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={lightboxSrc ?? undefined}
              alt="Full size"
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Internal sub-buttons ──────────────────────────────────────────────────────

function RegenerateButtonInternal({ messageId, sessionId }: { messageId: number; sessionId: number }) {
  const { regenerate } = useRegenerate({ sessionId });
  return (
    <button
      onClick={() => regenerate(messageId)}
      className="p-1.5 rounded hover:bg-muted text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      title="Regenerate response"
    >
      <RefreshCw className="size-3.5" />
    </button>
  );
}

function ThreadButtonInternal({ sessionId: _sid }: { sessionId: number }) {
  const { openPanel } = useThreadStore();
  return (
    <button
      onClick={openPanel}
      className="p-1.5 rounded hover:bg-muted text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      title="View thread"
    >
      <MessageSquarePlus className="size-3.5" />
    </button>
  );
}

function BranchButtonInternal({ messageId, sessionId }: { messageId: number; sessionId: number }) {
  const createBranch = useCreateBranch(sessionId);
  return (
    <button
      onClick={() => createBranch.mutate({ messageId })}
      className="p-1.5 rounded hover:bg-muted text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      title="Branch from here"
    >
      <GitBranch className="size-3.5" />
    </button>
  );
}

// ── Memo with smart comparator ────────────────────────────────────────────────

export const ChatMessage = memo(ChatMessageComponent, (prev, next) => {
  // Different message entirely — always re-render
  if (prev.message.id !== next.message.id) return false;

  // During streaming, ALWAYS re-render — the SDK may mutate parts in place,
  // so shallow comparisons on text/reasoning are unreliable during active streaming.
  if (prev.isStreaming || next.isStreaming) return false;

  // Not streaming: use content-aware comparisons
  if (getMsgText(prev.message) !== getMsgText(next.message)) return false;
  if (prev.message.parts?.length !== next.message.parts?.length) return false;
  if (prev.currentOccurrenceId !== next.currentOccurrenceId) return false;
  if (prev.occurrences === next.occurrences) return true;
  if (!prev.occurrences || !next.occurrences) return false;
  if (prev.occurrences.length !== next.occurrences.length) return false;
  if (prev.occurrences.length > 0 && prev.occurrences[0] !== next.occurrences[0]) return false;
  return true;
});
