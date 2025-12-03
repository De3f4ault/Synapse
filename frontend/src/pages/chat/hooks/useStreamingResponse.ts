/**
 * useStreamingResponse - Refactored WebSocket Hook (v2)
 *
 * FIXES:
 * 1. Single source of truth (ConnectionStatus discriminated union)
 * 2. ONE effect to rule them all (no duplicate connections)
 * 3. Guaranteed message persistence (save before clear)
 * 4. Track connected sessionId to prevent duplicates
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ChatMessageResponse } from '@/api/generated/types.gen';

// ==================== TYPES ====================

/**
 * Single source of truth for connection state
 */
type ConnectionStatus =
| { state: 'disconnected' }
| { state: 'connecting'; attempt: number; sessionId: number }
| { state: 'ready'; ws: WebSocket; sessionId: number }
| { state: 'error'; reason: string };

export type WebSocketState = ConnectionStatus['state'];

interface BackendWSMessage {
  type: 'connected' | 'thinking' | 'token' | 'sources' | 'complete' | 'error';
  data: any;
}

interface UseStreamingResponseOptions {
  sessionId?: number;
  onMessage?: (message: BackendWSMessage) => void;
  onStateChange?: (state: WebSocketState) => void;
  autoConnect?: boolean;
}

/**
 * In-memory buffer for accumulating streaming content
 */
interface StreamBuffer {
  content: string;
  thinking: string;
  sources: any[];
  model: string;
}

// ==================== CONSTANTS ====================

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

// ==================== HOOK ====================

export const useStreamingResponse = ({
  sessionId,
  onMessage,
  onStateChange,
  autoConnect = true,
}: UseStreamingResponseOptions) => {
  const queryClient = useQueryClient();

  // ==================== STATE ====================

  // Single source of truth (now tracks which session we're connected to)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    state: 'disconnected'
  });

  // Streaming UI state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingThinking, setStreamingThinking] = useState('');
  const [streamingSources, setStreamingSources] = useState<any[]>([]);

  // In-memory buffer (separate from UI state for clean separation)
  const bufferRef = useRef<StreamBuffer>({
    content: '',
    thinking: '',
    sources: [],
    model: '',
  });

  // Reconnection management
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // ==================== DERIVED STATE ====================

  const connectionState = connectionStatus.state;
  const isConnected = connectionStatus.state === 'ready';
  const ws = connectionStatus.state === 'ready' ? connectionStatus.ws : null;
  const connectedSessionId = connectionStatus.state === 'ready' || connectionStatus.state === 'connecting'
  ? connectionStatus.sessionId
  : undefined;

  // ==================== HELPERS ====================

  const updateConnectionStatus = useCallback((newStatus: ConnectionStatus) => {
    if (!isMountedRef.current) return;

    console.log('[WS] State transition:', {
      from: connectionStatus.state,
      to: newStatus.state,
      sessionId: 'sessionId' in newStatus ? newStatus.sessionId : undefined,
    });

    setConnectionStatus(newStatus);
    onStateChange?.(newStatus.state);
  }, [connectionStatus.state, onStateChange]);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const getAuthToken = useCallback((): string | null => {
    try {
      const authData = localStorage.getItem('synapse-auth');
      if (!authData) return null;
      const parsed = JSON.parse(authData);
      return parsed?.state?.token || null;
    } catch (error) {
      console.error('[WS] Failed to parse auth data:', error);
      return null;
    }
  }, []);

  /**
   * CRITICAL: Persist accumulated message to cache BEFORE clearing
   */
  const persistBufferToCache = useCallback(() => {
    const { content, model } = bufferRef.current;

    if (!content || !sessionId) {
      console.log('[WS] No content to persist');
      return;
    }

    console.log('[WS] 💾 Persisting message to cache:', {
      contentLength: content.length,
      sessionId,
      model,
    });

    const assistantMessage: ChatMessageResponse = {
      id: Date.now() + 1, // Temp ID until backend responds
                                           session_id: sessionId,
                                           role: 'assistant',
                                           content,
                                           tokens: Math.ceil(content.length / 4),
                                           model_used: model || 'unknown',
                                           function_calls: null,
                                           grounding_sources: null,
                                           created_at: new Date().toISOString(),
    };

    queryClient.setQueryData<ChatMessageResponse[]>(
      ['chat-messages', sessionId],
      (old = []) => {
        console.log('[WS] ✅ Message persisted. Cache size:', old.length + 1);
        return [...old, assistantMessage];
      }
    );

    // Fetch real message from backend after a short delay
    setTimeout(() => {
      if (isMountedRef.current) {
        queryClient.invalidateQueries({
          queryKey: ['chat-messages', sessionId],
          exact: true,
        });
      }
    }, 500);
  }, [sessionId, queryClient]);

  /**
   * Clear buffer and UI state (called AFTER persistence)
   */
  const clearStreamingState = useCallback(() => {
    console.log('[WS] Clearing streaming state');

    bufferRef.current = {
      content: '',
      thinking: '',
      sources: [],
      model: '',
    };

    setIsStreaming(false);
    setStreamingContent('');
    setStreamingThinking('');
    setStreamingSources([]);
  }, []);

  // ==================== MESSAGE HANDLERS ====================

  const handleWSMessage = useCallback((event: MessageEvent) => {
    try {
      const message: BackendWSMessage = JSON.parse(event.data);
      console.log('[WS] Received:', message.type);

      onMessage?.(message);

      switch (message.type) {
        case 'connected':
          console.log('[WS] Server confirmed connection:', {
            session_id: message.data.session_id,
            user_id: message.data.user_id,
          });
          // Connection is already in 'ready' state from onopen
          break;

        case 'thinking':
          const thinkingText = message.data.text;
          bufferRef.current.thinking += thinkingText;
          bufferRef.current.model = message.data.model;
          setStreamingThinking((prev) => prev + thinkingText);
          setIsStreaming(true);
          break;

        case 'token':
          const tokenText = message.data.text;
          bufferRef.current.content += tokenText;
          bufferRef.current.model = message.data.model;
          setStreamingContent((prev) => prev + tokenText);
          setIsStreaming(true);
          break;

        case 'sources':
          bufferRef.current.sources = message.data.sources;
          setStreamingSources(message.data.sources);
          break;

        case 'complete':
          console.log('[WS] 🎯 Stream complete:', {
            total_tokens: message.data.total_tokens,
            model: message.data.model_used,
          });

          // Update model from complete message
          bufferRef.current.model = message.data.model_used || bufferRef.current.model;

          // CRITICAL: Persist BEFORE clearing
          persistBufferToCache();
          clearStreamingState();
          break;

        case 'error':
          console.error('[WS] Server error:', message.data.message);
          clearStreamingState();
          break;
      }
    } catch (error) {
      console.error('[WS] Failed to parse message:', error);
    }
  }, [onMessage, persistBufferToCache, clearStreamingState]);

  // ==================== CONNECTION MANAGEMENT ====================

  const connect = useCallback((targetSessionId: number) => {
    // Prevent duplicate connections
    if (connectionStatus.state === 'connecting' && connectionStatus.sessionId === targetSessionId) {
      console.log('[WS] Already connecting to session:', targetSessionId);
      return;
    }

    if (connectionStatus.state === 'ready' && connectionStatus.sessionId === targetSessionId) {
      console.log('[WS] Already connected to session:', targetSessionId);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      console.error('[WS] No auth token');
      updateConnectionStatus({ state: 'error', reason: 'No auth token' });
      return;
    }

    clearReconnectTimeout();

    const attempt = connectionStatus.state === 'error' ? 1 : 0;
    updateConnectionStatus({ state: 'connecting', attempt, sessionId: targetSessionId });

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    const wsEndpoint = `${wsUrl}/ws/chat/${targetSessionId}?token=${token}`;

    console.log('[WS] Connecting to:', wsEndpoint);

    const websocket = new WebSocket(wsEndpoint);

    websocket.onopen = () => {
      console.log('[WS] Transport connected, waiting for server confirmation...');
      // Don't update state yet - wait for 'connected' message
    };

    websocket.onmessage = (event) => {
      // First message should be 'connected' type
      try {
        const message: BackendWSMessage = JSON.parse(event.data);
        if (message.type === 'connected') {
          console.log('[WS] ✅ Server confirmed, connection ready');
          updateConnectionStatus({ state: 'ready', ws: websocket, sessionId: targetSessionId });
        }
      } catch (e) {
        // Ignore parse errors on first message
      }

      handleWSMessage(event);
    };

    websocket.onerror = (error) => {
      console.error('[WS] WebSocket error:', error);
      updateConnectionStatus({ state: 'error', reason: 'Connection error' });
    };

    websocket.onclose = (event) => {
      console.log('[WS] Closed:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });

      updateConnectionStatus({ state: 'disconnected' });

      // Reconnect logic
      if (isMountedRef.current && attempt < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(
          RECONNECT_BASE_DELAY * Math.pow(2, attempt),
                               MAX_RECONNECT_DELAY
        );

        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${attempt + 1})`);

        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            connect(targetSessionId);
          }
        }, delay);
      } else if (attempt >= MAX_RECONNECT_ATTEMPTS) {
        console.error('[WS] Max reconnect attempts reached');
        updateConnectionStatus({ state: 'error', reason: 'Max reconnects reached' });
      }
    };
  }, [
    connectionStatus,
    getAuthToken,
    updateConnectionStatus,
    clearReconnectTimeout,
    handleWSMessage,
  ]);

  const disconnect = useCallback(() => {
    console.log('[WS] Disconnecting...');

    clearReconnectTimeout();

    if (ws) {
      ws.close();
    }

    updateConnectionStatus({ state: 'disconnected' });
  }, [ws, clearReconnectTimeout, updateConnectionStatus]);

  // ==================== SEND MESSAGE ====================

  const sendMessage = useCallback((content: string) => {
    console.log('[WS] sendMessage:', {
      contentLength: content.length,
      isReady: connectionStatus.state === 'ready',
      sessionId,
    });

    if (connectionStatus.state !== 'ready') {
      throw new Error(`Cannot send: connection not ready (state: ${connectionStatus.state})`);
    }

    const { ws } = connectionStatus;

    try {
      const message = {
        type: 'message' as const,
        content,
      };

      ws.send(JSON.stringify(message));
      console.log('[WS] ✅ Message sent');

      // Add user message optimistically
      const userMessage: ChatMessageResponse = {
        id: Date.now(),
                                  session_id: sessionId!,
                                  role: 'user',
                                  content,
                                  tokens: Math.ceil(content.length / 4),
                                  model_used: null,
                                  created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<ChatMessageResponse[]>(
        ['chat-messages', sessionId],
        (old = []) => [...old, userMessage]
      );

      // Reset streaming state for new message
      clearStreamingState();

      return true;
    } catch (error) {
      console.error('[WS] Failed to send:', error);
      throw error;
    }
  }, [connectionStatus, sessionId, queryClient, clearStreamingState]);

  // ==================== LIFECYCLE ====================

  // ONE EFFECT TO RULE THEM ALL
  useEffect(() => {
    console.log('[WS] Effect triggered:', {
      sessionId,
      autoConnect,
      currentState: connectionStatus.state,
      connectedTo: connectedSessionId,
    });

    isMountedRef.current = true;

    // Cleanup function
    const cleanup = () => {
      console.log('[WS] Effect cleanup');
      clearReconnectTimeout();

      if (connectionStatus.state === 'ready') {
        connectionStatus.ws.close();
      }
    };

    // Case 1: No sessionId - disconnect if connected
    if (!sessionId) {
      if (connectionStatus.state === 'ready' || connectionStatus.state === 'connecting') {
        console.log('[WS] No sessionId, disconnecting');
        disconnect();
      }
      return cleanup;
    }

    // Case 2: AutoConnect disabled - do nothing
    if (!autoConnect) {
      console.log('[WS] AutoConnect disabled');
      return cleanup;
    }

    // Case 3: Already connected to this session - do nothing
    if (connectedSessionId === sessionId && connectionStatus.state === 'ready') {
      console.log('[WS] ✅ Already connected to session:', sessionId);
      return cleanup;
    }

    // Case 4: Already connecting to this session - do nothing
    if (connectedSessionId === sessionId && connectionStatus.state === 'connecting') {
      console.log('[WS] Already connecting to session:', sessionId);
      return cleanup;
    }

    // Case 5: Need to connect to different session
    console.log('[WS] Connecting to session:', sessionId);

    // Disconnect from old session first
    if (connectionStatus.state === 'ready' || connectionStatus.state === 'connecting') {
      console.log('[WS] Disconnecting from old session first');
      disconnect();

      // Give disconnect time to complete before connecting
      setTimeout(() => {
        if (isMountedRef.current) {
          connect(sessionId);
        }
      }, 100);
    } else {
      connect(sessionId);
    }

    return cleanup;
  }, [sessionId, autoConnect]); // Only depend on sessionId and autoConnect

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[WS] Component unmounting');
      isMountedRef.current = false;
    };
  }, []);

  // ==================== RETURN ====================

  return {
    // Connection state
    connectionState,
    isConnected,

    // Streaming state
    isStreaming,
    streamingContent,
    streamingThinking,
    streamingSources,
    currentModel: bufferRef.current.model,

    // Methods
    connect: () => sessionId && connect(sessionId),
    disconnect,
    sendMessage,

    // Legacy compatibility (for gradual migration)
    isConnectionConfirmed: isConnected,
    webSocketReadyState: ws?.readyState,
  };
};

export default useStreamingResponse;
