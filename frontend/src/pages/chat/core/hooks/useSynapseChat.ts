/**
 * useSynapseChat — Thin wrapper around Vercel AI SDK `useChat`.
 *
 * DESIGN (Pure Vercel):
 * - SDK is the SOLE source of truth for all message state.
 * - `initialMessages` seeds DB history exactly once; SDK takes over after that.
 * - During seeding we smartly parse <think> tags → reasoning parts so
 *   ChatMessage never needs to regex-parse raw strings again.
 * - No manual streaming state, no token buffers, no optimistic updates.
 * - `onFinish` invalidates React Query so DB re-syncs after stream ends.
 *
 * Transport: LiteLLM Router → FastAPI SSE → Vercel UI Message Stream Protocol v1
 */

import { useMemo, useCallback, useLayoutEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '../state/chatStore';
import type { ChatMessageResponse } from '@/api/generated';

// ── Types ───────────────────────────────────────────────────────────────────

interface UseSynapseChatOptions {
  sessionId: number;
  /** Pre-loaded DB messages — used as initial seed only, never polled again. */
  initialMessages?: ChatMessageResponse[];
}

interface UseSynapseChatReturn {
  /** SDK-owned messages — the single source of truth for rendering. */
  messages: UIMessage[];
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  error: Error | undefined;
  sendMessage: (content: string, options?: { attachmentIds?: number[]; previewUrls?: string[] }) => void;
  stop: () => void;
  regenerate: () => void;
  setMessages: (messages: UIMessage[]) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Parse DB-stored content back into SDK UIMessage parts.
 *
 * Handles (in order):
 *   1. `<think>…</think>` at the start  → reasoning part
 *   2. ```synapse-flashcards``` fences   → data-artifact part (flashcard_set)
 *   3. ```synapse-quiz``` fences         → data-artifact part (quiz)
 *   4. Plain text between/around fences  → text parts
 *
 * This allows both old and new DB messages to render structured content
 * (flashcards, quizzes) as proper UI components instead of raw JSON.
 */
function seedPartsFromContent(content: string, isUser: boolean): any[] {
  if (isUser || !content) {
    return [{ type: 'text', text: content }];
  }

  const parts: any[] = [];
  let remaining = content;

  // ── 1. Strip leading <think> block ──────────────────────────────────────────
  const thinkMatch = remaining.match(/^<think>\n?([\s\S]*?)\n?<\/think>[ \t]*\n?/);
  if (thinkMatch) {
    const thinking = thinkMatch[1]?.trim();
    if (thinking) parts.push({ type: 'reasoning', text: thinking });
    remaining = remaining.slice(thinkMatch[0].length);
  }

  // ── 2. Walk the rest, extracting synapse fences ──────────────────────────────
  const FENCE_RE = /```(synapse-flashcards|synapse-quiz)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = FENCE_RE.exec(remaining)) !== null) {
    // plain text before this fence
    const before = remaining.slice(lastIndex, match.index).trim();
    if (before) parts.push({ type: 'text', text: before });

    const lang = match[1] || '';
    const raw  = (match[2] || '').trim();
    try {
      const payload = JSON.parse(raw);
      const artifactType = lang === 'synapse-flashcards' ? 'flashcard_set' : 'quiz';
      parts.push({
        type: 'data-artifact',
        data: {
          id: `seed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          artifact_type: artifactType,
          title: (payload as any)?.title ??
                 (artifactType === 'flashcard_set' ? 'Flashcards' : 'Quiz'),
          payload,
          state: 'ready',
        },
      });
    } catch {
      // Malformed JSON — fall back to raw text
      parts.push({ type: 'text', text: `\`\`\`${lang}\n${raw}\n\`\`\`` });
    }

    lastIndex = match.index + match[0].length;
  }

  // trailing text after the last fence
  const after = remaining.slice(lastIndex).trim();
  if (after) parts.push({ type: 'text', text: after });

  // Fallback: nothing extracted — return whole content as text
  return parts.length > 0 ? parts : [{ type: 'text', text: content }];
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useSynapseChat({
  sessionId,
  initialMessages,
}: UseSynapseChatOptions): UseSynapseChatReturn {
  const queryClient = useQueryClient();

  // Convert DB messages → SDK UIMessage seed.
  // Re-compute whenever initialMessages reference changes (React Query refetch).
  const seedMessages: UIMessage[] = useMemo(() => {
    if (!initialMessages?.length) return [];
    return initialMessages.map((msg) => {
      const isUser = msg.role === 'user';
      return {
        id: String(msg.id),
        role: msg.role as 'user' | 'assistant',
        content: msg.content || '',
        parts: seedPartsFromContent(msg.content || '', isUser),
        createdAt: msg.created_at ? new Date(msg.created_at) : new Date(),
        metadata: {
          dbId: msg.id,
          sessionId: msg.session_id,
          attachments: (msg as any).attachments ?? [],
          groundingSources: (msg as any).grounding_sources ?? [],
          entities: (msg as any).entities ?? [],
          functionCalls: (msg as any).function_calls ?? null,
        },
      };
    });
  }, [initialMessages]);

  // Transport — standard Vercel DefaultChatTransport
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${API_BASE}/api/v1/chat/sessions/${sessionId}/stream`,
        headers: () => ({
          Authorization: `Bearer ${useAuthStore.getState().token || ''}`,
        }),
        credentials: 'include' as RequestCredentials,
      }),
    [sessionId],
  );

  const {
    messages,
    sendMessage: sdkSendMessage,
    stop,
    status,
    error,
    setMessages,
    regenerate,
  } = useChat({
    id: `synapse-chat-${sessionId}`,
    transport,
    // NOTE: We do NOT use `messages` (controlled mode) — that was the root cause
    // of the UI flickering bug. Instead we seed via setMessages in a layout effect.
    experimental_throttle: 50,
    onFinish: () => {
      // After stream ends, re-sync DB so navigating away and back gets fresh history.
      queryClient.invalidateQueries({ queryKey: ['chat-messages', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
    },
    onError: (err: Error) => {
      console.error('[SynapseChat] Stream error:', err.message, err);
      useChatStore.getState().setError(err.message);
    },
  });

  // ── Seed DB history into SDK ──────────────────────────────────────────────
  // Runs synchronously before browser paint (useLayoutEffect) to avoid flash.
  //
  // FIX: Previous logic tracked "which session was seeded" — this caused a bug
  // where the first render had seedMessages=[] (React Query still loading),
  // marked the session as seeded, and then never re-seeded when data arrived.
  //
  // New logic: track both session ID AND whether we've seeded with actual data.
  // Re-seed when seedMessages goes from empty → populated (initial load).
  // Skip re-seeding when already populated (prevents overwriting during streaming).
  const seededSessionRef = useRef<number | null>(null);
  const seededWithDataRef = useRef(false);

  useLayoutEffect(() => {
    const isNewSession = seededSessionRef.current !== sessionId;
    const hasData = seedMessages.length > 0;

    if (isNewSession) {
      // New session: reset tracking
      seededSessionRef.current = sessionId;
      seededWithDataRef.current = false;
    }

    if (hasData && !seededWithDataRef.current) {
      // First time we have actual messages for this session — seed them
      seededWithDataRef.current = true;
      setMessages(seedMessages);
    }
  }, [sessionId, seedMessages, setMessages]);

  // ── sendMessage ─────────────────────────────────────────────────────────
  // No optimistic update hack needed — the SDK appends the user message
  // to its own messages[] instantly before the first SSE byte arrives.
  //
  // IMPORTANT: We pass local blob: URLs (from the file preview) as
  // experimental_attachments, NOT server thumbnail URLs. The Vercel SDK
  // would try to fetch server URLs before sending the stream request —
  // which can silently fail and abort the entire send. Local blob: URLs
  // are already in memory and need zero network calls.
  // The actual image bytes reach the backend via attachment_ids in the body.
  const sendMessage = useCallback(
    (content: string, options?: { attachmentIds?: number[]; previewUrls?: string[] }) => {
      useChatStore.getState().clearError();

      // Hoist before the map so TypeScript knows both are defined in scope
      const { attachmentIds, previewUrls } = options ?? {};

      // Build experimental_attachments from local preview blob: URLs only
      const sdkAttachments = attachmentIds?.map((id, idx) => ({
        name: `Attachment ${id}`,
        contentType: 'image/jpeg',
        // Use the local blob: URL if available — avoids any network fetch by the SDK
        url: previewUrls?.[idx] ?? `data:image/jpeg;base64,`,
      }));

      sdkSendMessage(
        { 
          text: content,
          ...(sdkAttachments?.length ? { experimental_attachments: sdkAttachments } : {})
        },
        {
          body: {
            mode: useChatStore.getState().chatMode,
            model_id: useChatStore.getState().selectedModel || undefined,
            ...(attachmentIds?.length
              ? { attachment_ids: attachmentIds }
              : {}),
          },
        },
      );
    },
    [sdkSendMessage],
  );

  return { messages, status, error, sendMessage, stop, regenerate, setMessages };
}

export default useSynapseChat;
