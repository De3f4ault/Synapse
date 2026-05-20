/**
 * useCardTutorChat — Vercel AI SDK v3, mirrors useSynapseChat exactly.
 *
 * Key design decision (why the previous version was broken):
 *   The tutor was using a hand-rolled `Chat` class with a custom transport
 *   that returned a raw ReadableStream. DefaultChatTransport expects the
 *   Vercel UI Message Stream Protocol v1 (the same format the backend already
 *   sends). The custom transport bypassed the protocol layer, so chunks were
 *   never parsed into UIMessage parts.
 *
 *   Fix: use DefaultChatTransport identical to useSynapseChat. The backend
 *   endpoint is the same (/api/v1/chat/sessions/{id}/stream) — it already
 *   speaks UISP v1.
 *
 * Deck-scoped session (backend change):
 *   POST /cards/{card_id}/tutor now returns a deck-scoped session.
 *   Multiple cards share one session; each message carries a card_id tag
 *   so history is filterable per card. The panel seeds the opening message
 *   from the API response and then hands off to the SDK.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { getAuthToken } from '@/api/client';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// ── Types ────────────────────────────────────────────────────────────────────

interface TutorSession {
  session_id: number;
  card_id: number;
  deck_id: number;
  topic: string;
  deck_name: string | null;
  is_new: boolean;
  opening_message: string;
  system_prompt: string;
}

interface UseCardTutorChatOptions {
  /** null = panel closed */
  cardId: number | null;
  onClose?: () => void;
}

interface UseCardTutorChatResult {
  tutorSession: TutorSession | null;
  isOpeningSession: boolean;
  sessionError: string | null;

  messages: UIMessage[];
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  error: Error | undefined;
  stop: () => void;
  sendMessage: ReturnType<typeof useChat>['sendMessage'];
  setMessages: ReturnType<typeof useChat>['setMessages'];

  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;

  openTutor: (cardId: number) => Promise<void>;
  closeTutor: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCardTutorChat({
  cardId,
  onClose,
}: UseCardTutorChatOptions): UseCardTutorChatResult {
  const [tutorSession, setTutorSession] = useState<TutorSession | null>(null);
  const [isOpeningSession, setIsOpening] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [input, setInput] = useState('');

  // The active session_id drives the transport URL.
  // When it changes, useMemo rebuilds DefaultChatTransport → useChat gets new id.
  const [sessionId, setSessionId] = useState<number | null>(null);

  // Pending opening message — staged before sessionId is set so the
  // useEffect below can inject it once the new useChat instance is live.
  const pendingOpeningMsg = useRef<string | null>(null);   // kept for compat
  // Full seed array: [history..., divider?, opening] — set by openTutor, consumed by effect
  const pendingMessages = useRef<UIMessage[]>([]);

  // openKey increments on every openTutor() call. This is what triggers the
  // message-seed effect — NOT sessionId. Multiple cards share the same
  // deck-scoped session_id, so watching only sessionId would miss card switches.
  const [openKey, setOpenKey] = useState(0);

  // ── Transport — identical pattern to useSynapseChat ────────────────────────
  const transport = useMemo(() => {
    if (!sessionId) return new DefaultChatTransport({ api: `${API_BASE}/api/v1/chat/sessions/0/stream` });
    const currentCardId = tutorSession?.card_id;
    return new DefaultChatTransport({
      api: `${API_BASE}/api/v1/chat/sessions/${sessionId}/stream`,
      headers: {
        Authorization: `Bearer ${getAuthToken() || ''}`,
      },
      credentials: 'include' as RequestCredentials,
      body: {
        // Tag every message with the current card so the backend stores card_id
        // on each ChatMessage row — enables per-card message filtering later.
        card_id: currentCardId,
        mode: 'socratic',
      },
    });
  }, [sessionId, tutorSession?.card_id]);

  const {
    messages,
    sendMessage,
    stop,
    status,
    error,
    setMessages,
  } = useChat({
    // Unique id per session so SDK resets state cleanly on session change
    id: sessionId ? `tutor-session-${sessionId}` : 'tutor-idle',
    transport,
    experimental_throttle: 30,
  });

  // ── Seed all pending messages after transport rebuild ─────────────────────
  // Fires when openKey increments (every openTutor() call).
  // We intentionally do NOT watch only sessionId here: multiple cards share
  // the same deck-scoped session_id, so a card switch from 624 → 625 would
  // leave sessionId unchanged (both = 191) and the history would never appear.
  useEffect(() => {
    const msgs = pendingMessages.current;
    if (!msgs.length) return;
    pendingMessages.current = [];
    pendingOpeningMsg.current = null;
    setMessages(msgs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openKey]);

  // ── openTutor ─────────────────────────────────────────────────────────────
  const openTutor = useCallback(async (cId: number) => {
    setIsOpening(true);
    setSessionError(null);

    try {
      const token = getAuthToken();
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

      // Fetch session + history in parallel
      const [sessionRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/cards/${cId}/tutor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader } as HeadersInit,
        }),
        fetch(`${API_BASE}/api/v1/cards/${cId}/tutor/history`, {
          headers: { ...authHeader } as HeadersInit,
        }),
      ]);

      if (!sessionRes.ok) {
        const err = await sessionRes.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(err.detail || `HTTP ${sessionRes.status}`);
      }

      const session: TutorSession = await sessionRes.json();
      const history = historyRes.ok ? await historyRes.json() : { messages: [], has_history: false };

      setTutorSession(session);

      // Build seed messages:
      // 1. Previous messages for this card (history from DB, excluding opening intro from same tutor call)
      // 2. A visual divider if there IS prior history
      // 3. The new opening message for the current visit
      const historyMsgs: UIMessage[] = (history.messages || [])
        .filter((m: any) => m.content !== session.opening_message || session.is_new === false)
        .map((m: any, i: number) => ({
          id: `history-${m.id ?? i}`,
          role: m.role as 'user' | 'assistant',
          parts: [{ type: 'text' as const, text: m.content as string }],
          createdAt: m.created_at ? new Date(m.created_at) : new Date(0),
        } as UIMessage));

      const divider: UIMessage | null = historyMsgs.length > 0
        ? ({
            id: `divider-${cId}-${Date.now()}`,
            role: 'assistant' as const,
            parts: [{ type: 'text' as const, text: '---divider---' }],
            createdAt: new Date(Date.now() - 1),
          } as UIMessage)
        : null;

      const openingMsg: UIMessage = ({
        id: `tutor-opening-${cId}-${Date.now()}`,
        role: 'assistant' as const,
        parts: [{ type: 'text' as const, text: session.opening_message }],
        createdAt: new Date(),
      } as UIMessage);

      pendingOpeningMsg.current = null; // not using ref path anymore
      pendingMessages.current = [
        ...historyMsgs,
        ...(divider ? [divider] : []),
        openingMsg,
      ];

      // Update sessionId (for transport URL), then increment openKey.
      // openKey change triggers the seed effect regardless of whether
      // sessionId changed (same deck session shared across cards).
      setSessionId(session.session_id);
      setOpenKey(k => k + 1);
    } catch (err: any) {
      setSessionError(err.message || 'Failed to open Card Tutor');
    } finally {
      setIsOpening(false);
    }
  }, []);

  // ── closeTutor ────────────────────────────────────────────────────────────
  const closeTutor = useCallback(() => {
    stop();
    pendingOpeningMsg.current = null;
    pendingMessages.current = [];
    setTutorSession(null);
    setSessionError(null);
    setSessionId(null);
    setMessages([]);
    setInput('');
    onClose?.();
  }, [stop, setMessages, onClose]);

  // ── Auto-open when cardId prop changes ────────────────────────────────────
  const lastCardIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (cardId && cardId !== lastCardIdRef.current) {
      lastCardIdRef.current = cardId;
      openTutor(cardId);
    }
    if (!cardId) {
      lastCardIdRef.current = null;
    }
  }, [cardId, openTutor]);

  return {
    tutorSession,
    isOpeningSession,
    sessionError,
    messages,
    status,
    error,
    stop,
    sendMessage,
    setMessages,
    input,
    setInput,
    openTutor,
    closeTutor,
  };
}
