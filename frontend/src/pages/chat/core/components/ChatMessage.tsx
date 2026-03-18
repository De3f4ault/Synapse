import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import { Copy, Check, RefreshCw, MessageSquarePlus, GitBranch } from "lucide-react";
import { ThinkingBlock } from "./ThinkingBlock";
import { ComparisonPanel } from "./ComparisonPanel";
import { toast } from "sonner";
import { HighlightedText } from "../../search/components/HighlightedText";
import { MarkdownRenderer } from "@/shared/rendering";
import { MermaidBlock } from "@/shared/rendering/components/MermaidBlock";
import { parseOutput } from "../engine/parseOutput";
import { ChatEntityPreview } from "./ChatEntityPreview";
import { MentionChip } from "./MentionChip";
import { ChatFlashcardSet } from "./ChatFlashcardSet";
import { ChatQuizPreview } from "./ChatQuizPreview";
import { ArtifactCard } from "../../artifacts/components/ArtifactCard";
import { BranchNavigator } from "./BranchNavigator";
import { useBranchNavigation, useCreateBranch } from "../hooks/useBranches";
import { useRegenerate } from "../hooks/useRegenerate";
import { entityKey } from "@/shared/core/entity";
import { useThreadStore } from "../state/threadStore";
import { useChatStore } from "../state/chatStore";
import { FlashcardsService, QuizzesService } from "@/api/generated";
import { QuizDifficulty, QuestionType } from "@/modules/quizzes/core/types";
import type { FlashcardCardPreview, QuizQuestionPreview } from "@/shared/rendering/schema";

import type { ChatMessageResponse } from "@/api/generated";
import type { SearchOccurrence } from "../../search/types";

import type { EntityIdentity } from "@/shared/core/entity";

interface ChatMessageProps {
  message: ChatMessageResponse & { entities?: EntityIdentity[] };
  isStreaming?: boolean;
  thinking?: string;
  occurrences?: SearchOccurrence[];
  currentOccurrenceId?: string | null;
}

const ChatMessageComponent = ({
  message,
  isStreaming = false,
  thinking = "",
  occurrences = [],
  currentOccurrenceId = null,
}: ChatMessageProps) => {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [savingFlashcards, setSavingFlashcards] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);

  // Branch navigation for assistant messages
  // INVARIANT: Only show for assistant messages, never for thread messages
  const branchNav = useBranchNavigation(
    !isUser && message.id > 0 ? message.id : undefined,
    message.session_id,
  );

  // Copy message to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content || "");
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  // Save flashcards to deck (preview -> owned content)
  // INVARIANT: This is the only path from chat preview to owned content
  const handleSaveFlashcards = async (cards: FlashcardCardPreview[], title?: string) => {
    if (savingFlashcards) return;
    setSavingFlashcards(true);

    try {
      const deckName = title || `Chat Flashcards (${new Date().toLocaleDateString()})`;
      const existingDecks = await FlashcardsService.listDecksApiV1DecksGet();
      const duplicate = existingDecks.find(d => d.name === deckName);
      
      if (duplicate) {
        toast.error(`Deck "${deckName}" already exists`);
        return;
      }

      const deck = await FlashcardsService.createDeckApiV1DecksPost({
        name: deckName,
        description: "Created from chat conversation",
      });

      await FlashcardsService.importFlashcardsApiV1DecksDeckIdImportPost(deck.id, {
        cards: cards.map(c => ({ front: c.front, back: c.back })),
      });

      toast.success(`${cards.length} flashcards saved to "${deckName}"!`);
    } catch (err: any) {
      console.error("Failed to save flashcards:", err);
      toast.error(err?.message || "Failed to save flashcards");
    } finally {
      setSavingFlashcards(false);
    }
  };

  // Save quiz (preview -> owned content)
  const handleSaveQuiz = async (quiz: { title: string; questions: QuizQuestionPreview[]; difficulty?: string }) => {
    if (savingQuiz) return;
    setSavingQuiz(true);

    try {
      const existingQuizzes = await QuizzesService.listQuizzesApiV1QuizzesGet();
      const duplicate = existingQuizzes.find(q => q.title === quiz.title);
      
      if (duplicate) {
        toast.error(`Quiz "${quiz.title}" already exists`);
        return;
      }

      const questions = quiz.questions.map(q => {
        let correctAnswer = '';
        if (q.correctIndex !== undefined && q.options && q.correctIndex < q.options.length) {
          correctAnswer = q.options[q.correctIndex] ?? '';
        } else if (q.correctAnswer) {
          correctAnswer = q.correctAnswer;
        }
        
        return {
          question_text: q.prompt,
          question_type: q.type === 'true_false' ? QuestionType.TRUE_FALSE : QuestionType.MULTIPLE_CHOICE,
          options: q.options ? { choices: q.options } : null,
          correct_answer: correctAnswer,
          explanation: q.explanation || null,
          points: 1,
        };
      });

      const difficultyMap: Record<string, QuizDifficulty> = {
        'easy': QuizDifficulty.EASY,
        'medium': QuizDifficulty.MEDIUM,
        'hard': QuizDifficulty.HARD,
      };

      await QuizzesService.createQuizApiV1QuizzesPost({
        title: quiz.title,
        description: "Created from chat conversation",
        difficulty: difficultyMap[quiz.difficulty || 'medium'] || QuizDifficulty.MEDIUM,
        questions,
      });

      toast.success(`Quiz "${quiz.title}" saved!`);
    } catch (err: any) {
      console.error("Failed to save quiz:", err);
      toast.error(err?.message || "Failed to save quiz");
    } finally {
      setSavingQuiz(false);
    }
  };

  // Filter occurrences for this message's first block (simplified)
  // In full implementation, would parse blocks and distribute occurrences
  const hasHighlights = occurrences.length > 0;

  // Render content based on message type
  const renderContent = () => {
    const content = effectiveContent;

    // User messages: plain text with optional highlighting
    if (isUser) {
      // Basic Mention Parsing
      // Regex: @\[([^\]]+)\]\(entity:([^:]+):([^)]+)\)
      // Matches @[Title](entity:type:id)
      const parts = [];
      let lastIndex = 0;
      const mentionRegex = /@\[([^\]]+)\]\(entity:([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+)\)/g;

      let match;
      const textContent = content; // Assuming content is string

      while ((match = mentionRegex.exec(textContent)) !== null) {
        if (match.index > lastIndex) {
          parts.push(textContent.substring(lastIndex, match.index));
        }
        parts.push({
          isMention: true,
          title: match[1],
          type: match[2],
          id: match[3],
          matchText: match[0]
        });
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < textContent.length) {
        parts.push(textContent.substring(lastIndex));
      }

      // Check for search highlights in text parts only? 
      // This is getting complex: HighlightedText needs full string or segment.
      // If we have search highlights, mixing with mentions is tricky.
      // Search logic typically operates on plain text. If mentions are raw markdown, search finds matches in raw text.
      // But we want to render mentions as chips. 
      // Simpler approach: If mentions exist, render chips. If highlights exist, render highlights on clean text?
      // For now, let's prioritize Mention rendering over Search highlights if both exist, 
      // or just apply highlighting to the text nodes.

      return (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {parts.map((part, i) => {
            if (typeof part === 'string') {
              // Fallback to simple string
              return <span key={i}>{part}</span>;
            } else {
              return (
                <MentionChip
                  key={i}
                  title={part.title || ""}
                  type={part.type as any}
                  id={part.id || ""}
                />
              );
            }
          })}
        </p>
      );
    }

    // AI messages: rich markdown rendering
    // TODO: When search highlighting is needed for markdown,
    // implement block-level highlighting in MarkdownRenderer
    // AI messages: block-based rendering (Engine)
    // If we have search highlights, we fall back to simple text for now (TODO: block-level highlighting)
    if (hasHighlights) {
      return (
        <div className="text-sm leading-relaxed">
          <HighlightedText
            content={content}
            occurrences={occurrences}
            currentOccurrenceId={currentOccurrenceId}
          />
        </div>
      );
    }

    // Engine: Parse content into blocks
    // Note: We're calling parsing inside render. Ideally memoized, but component is memoized.
    const blocks = parseOutput(content);

    return (
      <div className="text-sm w-full min-w-0 flex flex-col gap-4">
        {blocks.map((block, index) => {
          // Provide a unique key based on content and index to avoid re-render issues
          const key = `${block.type}-${index}`;

          switch (block.type) {
            case 'mermaid':
              return <MermaidBlock key={key} content={block.content} />;

            case 'code':
              // Reconstruct markdown for code blocks to maintain consistent styling via MarkdownRenderer
              return (
                <MarkdownRenderer key={key} content={`\`\`\`${block.language}\n${block.content}\n\`\`\``} />
              );

            case 'markdown':
              return <MarkdownRenderer key={key} content={block.content} className="break-words" />;

            case 'flashcard_set':
              return (
                <ChatFlashcardSet
                  key={key}
                  title={block.title}
                  cards={block.cards}
                  onSave={handleSaveFlashcards}
                />
              );

            case 'quiz':
              return (
                <ChatQuizPreview
                  key={key}
                  title={block.title}
                  questions={block.questions}
                  difficulty={block.difficulty}
                  onSave={handleSaveQuiz}
                />
              );

            case 'artifact':
              return (
                <ArtifactCard
                  key={key}
                  artifact={block}
                  onExpand={(id) => console.log('Expand artifact:', id)}
                />
              );

            default:
              // Other block types (Table, Citation, etc.) are not yet produced by parseOutput.
              // Handle them or return null to satisfy TypeScript.
              return null;
          }
        })}

        {/* Streaming cursor (appended to last block or strictly at bottom) */}
        {isStreaming && (
          <div className="h-4 w-1 bg-cyan-400 animate-pulse mt-1" />
        )}
      </div>
    );
  };

  // Grok colors
  const GROK_USER_BUBBLE = "#141414";

  // Detect saved comparison messages (from function_calls metadata)
  const comparisonData = !isUser && message.function_calls?.comparison;

  // Render saved comparison as side-by-side panel
  if (comparisonData) {
    return (
      <div data-message-id={message.id} className="w-full">
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

  // Parse persisted <think> tags from saved message content
  // When thinking content is saved to DB, it's wrapped as <think>\n...\n</think>
  const parsedThinking = (() => {
    if (isUser || thinking) return { thinkContent: "", remainingContent: message.content || "" };
    const content = message.content || "";
    const thinkMatch = content.match(/^<think>\n?([\s\S]*?)\n?<\/think>\s*([\s\S]*)$/);
    if (thinkMatch) {
      return {
        thinkContent: thinkMatch[1]?.trim() || "",
        remainingContent: thinkMatch[2]?.trim() || "",
      };
    }
    return { thinkContent: "", remainingContent: content };
  })();

  // Thinking toggle from store
  const showThinking = useChatStore((s) => s.showThinking);

  // Override message content for rendering if we parsed out thinking
  const effectiveContent = parsedThinking.thinkContent ? parsedThinking.remainingContent : (message.content || "");
  const effectiveThinking = thinking || parsedThinking.thinkContent;

  return (
    <div
      data-message-id={message.id}
      className={cn(
        "flex w-full gap-3",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      {/* Message Bubble */}
      <div
        className={cn(
          "flex flex-col gap-1",
          isUser ? "items-end max-w-[70%]" : "items-start max-w-[90%]",
        )}
      >
        {/* Thinking block — DeepSeek-style collapsible reasoning (respects toggle) */}
        {showThinking && effectiveThinking && (
          <ThinkingBlock content={effectiveThinking} isStreaming={isStreaming} />
        )}

        <div
          className={cn(
            "overflow-hidden min-w-0 transition-all duration-200",
            isUser
              // User: Compact pill bubble with Grok glassy gray
              ? "rounded-2xl rounded-br-sm px-4 py-2.5 text-zinc-100"
              // AI: Borderless, blends with canvas - no container styling
              : "px-1 py-2 text-zinc-200",
          )}
          style={isUser ? { backgroundColor: GROK_USER_BUBBLE } : undefined}
        >
          {renderContent()}

          {/* Referenced Entities */}
          {message.entities && message.entities.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                Referenced Context
              </span>
              {message.entities.map((ref) => (
                <ChatEntityPreview
                  key={entityKey(ref)}
                  entityRef={ref}
                />
              ))}
            </div>
          )}
        </div>

        {/* Message Footer: Time + Action Bar */}
        <div className="flex items-center gap-2 px-1 mt-1.5">
          <span className="text-[10px] text-zinc-500">
            {message.created_at
              ? new Date(message.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
              : "Just now"}
          </span>

          {/* Grok-style action bar - visible for assistant messages */}
          {!isUser && !isStreaming && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-[#363636]/50 border border-white/5">
              {/* Copy button */}
              <button
                onClick={handleCopy}
                className="p-1.5 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Copy"
              >
                {copied ? (
                  <Check className="size-3.5 text-green-400" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>

              {/* Regenerate button */}
              {message.id > 0 && (
                <RegenerateButtonInternal messageId={message.id} sessionId={message.session_id} />
              )}

              {/* Thread button */}
              <ThreadButtonInternal sessionId={message.session_id} />

              {/* Branch button - ChatGPT-style "Branch" */}
              {message.id > 0 && (
                <BranchButtonInternal messageId={message.id} sessionId={message.session_id} />
              )}

              {/* Branch Navigator */}
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

          {/* User message - simple copy */}
          {isUser && !isStreaming && (
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Copy message"
            >
              {copied ? (
                <Check className="size-3 text-green-400" />
              ) : (
                <Copy className="size-3" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Internal regenerate button with hook integration
 */
function RegenerateButtonInternal({ messageId, sessionId }: { messageId: number; sessionId: number }) {
  const { regenerate } = useRegenerate({ sessionId });

  return (
    <button
      onClick={() => regenerate(messageId)}
      className="p-1.5 rounded hover:bg-white/10 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      title="Regenerate response"
    >
      <RefreshCw className="size-3.5" />
    </button>
  );
}

/**
 * Internal thread button - Opens thread panel
 */
function ThreadButtonInternal({ sessionId: _sessionId }: { sessionId: number }) {
  const { openPanel } = useThreadStore();

  return (
    <button
      onClick={openPanel}
      className="p-1.5 rounded hover:bg-white/10 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      title="View thread"
    >
      <MessageSquarePlus className="size-3.5" />
    </button>
  );
}

/**
 * Internal branch button - Creates a new conversation branch from this message
 */
function BranchButtonInternal({ messageId, sessionId }: { messageId: number; sessionId: number }) {
  const createBranch = useCreateBranch(sessionId);

  return (
    <button
      onClick={() => createBranch.mutate({ messageId })}
      className="p-1.5 rounded hover:bg-white/10 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      title="Branch from here"
    >
      <GitBranch className="size-3.5" />
    </button>
  );
}

export const ChatMessage = memo(ChatMessageComponent, (prev, next) => {
  // Custom comparator to handle new array references for 'occurrences'
  if (prev.message.id !== next.message.id) return false;
  if (prev.message.content !== next.message.content) return false;
  if (prev.isStreaming !== next.isStreaming) return false;
  if (prev.thinking !== next.thinking) return false;
  if (prev.currentOccurrenceId !== next.currentOccurrenceId) return false;

  // Check occurrences array content equality
  if (prev.occurrences === next.occurrences) return true;
  if (!prev.occurrences || !next.occurrences) return false;
  if (prev.occurrences.length !== next.occurrences.length) return false;

  // If lengths match, check simplified equality (usually IDs if available, or just assume mismatch if length matches and strict eq fails, but for search results, strict eq failing usually means user typed query, so re-render is fine. BUT when typing in chat input, filter() always returns new array even if search results didn't change.)
  // Wait, occurrences come from search state. If search query didn't change, occurrences content is same.
  // So if search state is stable, filter returns new array but SAME item references?
  // Let's check filter(). Yes, items are same references.
  // So we can check strict equality of first item.
  if (prev.occurrences.length > 0 && prev.occurrences[0] !== next.occurrences[0]) return false;

  return true;
});

