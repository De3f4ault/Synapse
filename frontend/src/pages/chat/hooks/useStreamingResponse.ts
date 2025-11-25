/**
 * useStreamingResponse - Integrated WebSocket Hook
 * Manages WebSocket connection and streaming with optimistic updates
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ChatMessageResponse } from '@/api/generated/types.gen';

interface ChatWebSocketMessage {
  type: 'connected' | 'message' | 'chunk' | 'error' | 'done';
  session_id?: number;
  role?: 'user' | 'assistant';
  content?: string;
  streaming?: boolean;
  message_id?: number;
  error?: string;
}

type WebSocketState = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseStreamingResponseOptions {
  sessionId: number | undefined;
  onMessage?: (message: ChatWebSocketMessage) => void;
  onStateChange?: (state: WebSocketState) => void;
  autoConnect?: boolean;
}

export const useStreamingResponse = ({
  sessionId,
  onMessage,
  onStateChange,
  autoConnect = true,
}: UseStreamingResponseOptions) => {
  const queryClient = useQueryClient();
  const [connectionState, setConnectionState] = useState<WebSocketState>('disconnected');
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamingMessageIdRef = useRef<number | null>(null);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000;

  const updateConnectionState = useCallback((state: WebSocketState) => {
    setConnectionState(state);
    onStateChange?.(state);
  }, [onStateChange]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || !sessionId) {
      return;
    }

    // Get token from Zustand store format
    let token: string | undefined;
    try {
      const authData = localStorage.getItem('synapse-auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        token = parsed?.state?.token;
      }
    } catch (error) {
      console.error('Failed to parse auth data:', error);
    }

    if (!token) {
      console.error('No auth token found');
      updateConnectionState('error');
      return;
    }

    updateConnectionState('connecting');

    // Get WebSocket URL from environment
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    const wsEndpoint = `${wsUrl}/api/v1/ws/chat/${sessionId}?token=${token}`;

    console.log('Connecting to WebSocket:', wsEndpoint);

    const ws = new WebSocket(wsEndpoint);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
      updateConnectionState('connected');
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data: ChatWebSocketMessage = JSON.parse(event.data);
        onMessage?.(data);

        switch (data.type) {
          case 'connected':
            console.log('Connection confirmed');
            break;

          case 'chunk':
            setIsStreaming(true);
            if (data.content) {
              setStreamingMessage((prev) => prev + data.content);
            }
            break;

          case 'done':
            // Streaming complete - save the full message
            if (streamingMessage) {
              const completeMessage: ChatMessageResponse = {
                id: Date.now(),
                              session_id: sessionId,
                              role: 'assistant',
                              content: streamingMessage,
                              tokens: 0,
                              model_used: null,
                              created_at: new Date().toISOString(),
              };

              queryClient.setQueryData<ChatMessageResponse[]>(
                ['chat-messages', sessionId],
                (old = []) => [...old, completeMessage]
              );

              // Invalidate to fetch the real persisted message
              setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['chat-messages', sessionId] });
                queryClient.invalidateQueries({ queryKey: ['chat-session', sessionId] });
                queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
              }, 100);
            }
            setIsStreaming(false);
            setStreamingMessage('');
            break;

          case 'message':
            // Complete non-streaming message
            if (data.content && data.role) {
              const message: ChatMessageResponse = {
                id: data.message_id || Date.now(),
                              session_id: sessionId,
                              role: data.role,
                              content: data.content,
                              tokens: 0,
                              model_used: null,
                              created_at: new Date().toISOString(),
              };

              queryClient.setQueryData<ChatMessageResponse[]>(
                ['chat-messages', sessionId],
                (old = []) => [...old, message]
              );
            }
            break;

          case 'error':
            setIsStreaming(false);
            setStreamingMessage('');
            console.error('WebSocket error:', data.error);
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      updateConnectionState('error');
      console.error('WebSocket error occurred:', error);
    };

    ws.onclose = (event) => {
      updateConnectionState('disconnected');
      console.log('WebSocket closed:', event.code, event.reason);
      wsRef.current = null;

      // Attempt reconnection
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(
          RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
                               30000
        );
        reconnectAttemptsRef.current += 1;

        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`Reconnecting... attempt ${reconnectAttemptsRef.current}`);
          connect();
        }, delay);
      }
    };
  }, [sessionId, updateConnectionState, onMessage, queryClient, streamingMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    updateConnectionState('disconnected');
  }, [updateConnectionState]);

  const sendMessage = useCallback((content: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    try {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        content,
      }));

      // Reset streaming state
      setStreamingMessage('');
      streamingMessageIdRef.current = null;

      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && sessionId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [sessionId, autoConnect, connect, disconnect]);

  return {
    connectionState,
    isStreaming,
    streamingMessage,
    connect,
    disconnect,
    sendMessage,
    isConnected: connectionState === 'connected',
  };
};

export default useStreamingResponse;
