/**
 * useAssistant - Hook for assistant API operations
 * 
 * This hook handles all API interactions for the assistant:
 * - Session initialization
 * - Message sending/receiving
 * - Chat history loading
 * - Session management (create, switch, delete)
 * 
 * The store owns state, this hook owns operations.
 */

import { useCallback, useEffect, useRef } from "react";
import { ChatService } from "@/api/generated";
import { useAuthStore } from "@/stores/authStore";
import {
    useAssistantStore,
    useAssistantSessionId,
    useAssistantOpen,
    useAssistantMessages,
    useAssistantActions,
    WELCOME_MESSAGE,
    type UIMessage,
} from "../state";

// Counter for unique error IDs
let errorIdCounter = 0;

export function useAssistant() {
    const token = useAuthStore((state) => state.token);

    const isOpen = useAssistantOpen();
    const sessionId = useAssistantSessionId();
    const messages = useAssistantMessages();
    const historyLoaded = useAssistantStore((s) => s.historyLoaded);

    const {
        setSessionId,
        setSessions,
        addSession,
        removeSession,
        setInitializing,
        setMessages,
        addMessage,
        setTyping,
        setHistoryLoaded,
    } = useAssistantActions();

    // Ref to track if session creation is in progress
    const creatingSessionRef = useRef(false);

    // ============================================================
    // Chat History
    // ============================================================

    const loadChatHistory = useCallback(async (sid: number) => {
        setHistoryLoaded(false);

        try {
            const history = await ChatService.getMessagesApiV1ChatSessionsSessionIdMessagesGet(
                sid,
                50
            );

            if (history && history.length > 0) {
                const uiMessages: UIMessage[] = history.map((msg) => ({
                    id: msg.id || `msg-${Date.now()}`,
                    role: msg.role as "user" | "assistant",
                    content: msg.content || "",
                    timestamp: msg.created_at,
                    actions: msg.function_calls?.actions_taken || [],
                }));

                setMessages([WELCOME_MESSAGE, ...uiMessages]);
            } else {
                setMessages([WELCOME_MESSAGE]);
            }
            setHistoryLoaded(true);
        } catch (error) {
            console.error("Failed to load chat history", error);
            setMessages([WELCOME_MESSAGE]);
            setHistoryLoaded(true);
        }
    }, [setMessages, setHistoryLoaded]);

    // ============================================================
    // Sessions
    // ============================================================

    const loadSessions = useCallback(async () => {
        try {
            const allSessions = await ChatService.listSessionsApiV1ChatSessionsGet(1, 20);
            // Filter to Dashboard Assistant sessions
            const dashboardSessions = allSessions.filter(
                (s) => s.title.includes("Dashboard") || s.title.includes("Assistant")
            );
            setSessions(dashboardSessions.map(s => ({
                id: s.id,
                title: s.title,
                created_at: s.created_at,
                updated_at: s.updated_at,
            })));
        } catch (error) {
            console.error("Failed to load sessions", error);
        }
    }, [setSessions]);

    const createNewSession = useCallback(async (): Promise<number | null> => {
        try {
            const session = await ChatService.createSessionApiV1ChatSessionsPost({
                title: "Dashboard Assistant",
            });
            if (session.id) {
                addSession({
                    id: session.id,
                    title: session.title,
                    created_at: session.created_at,
                    updated_at: session.updated_at,
                });
                setSessionId(session.id);
                setMessages([WELCOME_MESSAGE]);
                setHistoryLoaded(true);
                return session.id;
            }
        } catch (error) {
            console.error("Failed to create session", error);
        }
        return null;
    }, [addSession, setSessionId, setMessages, setHistoryLoaded]);

    const switchSession = useCallback(async (newSessionId: number) => {
        setSessionId(newSessionId);
        await loadChatHistory(newSessionId);
    }, [setSessionId, loadChatHistory]);

    const deleteSession = useCallback(async (sessionIdToDelete: number) => {
        try {
            await ChatService.deleteSessionApiV1ChatSessionsSessionIdDelete(sessionIdToDelete);
            removeSession(sessionIdToDelete);

            // If deleting current session, create a new one
            if (sessionIdToDelete === sessionId) {
                await createNewSession();
            }
        } catch (error) {
            console.error("Failed to delete session", error);
        }
    }, [sessionId, removeSession, createNewSession]);

    // ============================================================
    // Messaging
    // ============================================================

    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim()) return;

        const userMsg: UIMessage = {
            role: "user",
            content,
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
        };

        addMessage(userMsg);
        setTyping(true);

        if (!token) {
            addMessage({
                role: "assistant",
                content: "You need to be logged in to use the dashboard assistant. Please log in first.",
                id: `error-auth-${Date.now()}-${++errorIdCounter}`,
                timestamp: new Date().toISOString(),
            });
            setTyping(false);
            return;
        }

        try {
            const response = await fetch("/api/v1/chat/sessions/dashboard/message", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ content }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data && data.content) {
                const botMsg: UIMessage = {
                    role: "assistant",
                    content: data.content,
                    id: data.id,
                    timestamp: data.created_at,
                    actions: data.function_calls?.actions_taken || [],
                };
                addMessage(botMsg);

                if (data.session_id && !sessionId) {
                    setSessionId(data.session_id);
                }

                // Generate title if first user message
                const userMessagesCount = messages.filter((m) => m.role === "user").length;
                if (userMessagesCount === 1 && sessionId) {
                    const title = await generateSessionTitle(content);
                    await updateSessionTitle(sessionId, title);
                }

                loadSessions();
            }
        } catch (error) {
            console.error("Dashboard AI error:", error);
            addMessage({
                role: "assistant",
                content: "I encountered an error processing your request. Please try again.",
                id: `error-api-${Date.now()}-${++errorIdCounter}`,
                timestamp: new Date().toISOString(),
            });
        } finally {
            setTyping(false);
        }
    }, [token, sessionId, messages, addMessage, setTyping, setSessionId, loadSessions]);

    // ============================================================
    // Title Generation
    // ============================================================

    const generateSessionTitle = async (firstMessage: string): Promise<string> => {
        try {
            const response = await fetch("/api/v1/chat/sessions/dashboard/message", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    content: `Generate a concise 3-5 word title for this question: "${firstMessage}"

Rules:
- Be specific and descriptive
- Remove filler words (help me, can you, etc.)
- Focus on the main topic
- Use title case

Title:`,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                let title = data.content?.trim().replace(/^["']|["']$/g, "");

                if (!title || title.length > 60) {
                    const words = firstMessage.split(" ").slice(0, 5);
                    title = words.join(" ") + (firstMessage.split(" ").length > 5 ? "..." : "");
                }

                return title;
            }
        } catch (error) {
            console.error("Failed to generate title:", error);
        }

        // Fallback
        const words = firstMessage.split(" ").slice(0, 5);
        return words.join(" ") + (firstMessage.split(" ").length > 5 ? "..." : "");
    };

    const updateSessionTitle = async (sid: number, title: string) => {
        try {
            await fetch(`/api/v1/chat/sessions/${sid}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ title }),
            });

            // Update local state
            const sessions = useAssistantStore.getState().sessions;
            setSessions(sessions.map((s) => (s.id === sid ? { ...s, title } : s)));
        } catch (error) {
            console.error("Failed to update session title:", error);
        }
    };

    // ============================================================
    // Initialization
    // ============================================================

    useEffect(() => {
        const initSession = async () => {
            const storedId = sessionId;

            if (storedId) {
                if (isOpen && !historyLoaded) {
                    await loadChatHistory(storedId);
                }
                setInitializing(false);
            } else if (!creatingSessionRef.current) {
                creatingSessionRef.current = true;
                setInitializing(true);
                await createNewSession();
                setInitializing(false);
                creatingSessionRef.current = false;
            }

            await loadSessions();
        };

        initSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load history when widget opens
    useEffect(() => {
        if (isOpen && sessionId && !historyLoaded) {
            loadChatHistory(sessionId);
        }
    }, [isOpen, sessionId, historyLoaded, loadChatHistory]);

    return {
        // Operations
        sendMessage,
        createNewSession,
        switchSession,
        deleteSession,
        loadSessions,
    };
}
