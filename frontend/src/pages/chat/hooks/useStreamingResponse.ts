/**
 * useStreamingResponse - WebSocket streaming
 * Manages WebSocket connection and streaming message updates
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { ChatWebSocketClient } from '@/api/websocket/chat';
import type { ChatWSMessage, WebSocketState } from '@/api/websocket/types';
import type { ChatMessageResponse } from '@/api/generated/types.gen';
import { useAddMessage, useUpdateMessage } from './useChatMessages';

interface UseStreamingResponseOptions {
  sessionId: number | undefined;
  onMessage?: (message: ChatWSMessage) => void;
  onStateChange?: (state: WebSocketState) => void;
  autoConnect?: boolean;
}

export const useStreamingResponse = ({
  sessionId,
  onMessage,
  onStateChange,
  autoConnect = true,
}: UseStreamingResponseOptions) => {
  const [connectionState, setConnectionState] = useState<WebSocketState>('disconnected');
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const wsClientRef = useRef<ChatWebSocketClient | null>(null);
  const streamingMessageIdRef = useRef<number | null>(null);

  const addMessage = useAddMessage(sessionId);
  const updateMessage = useUpdateMessage(sessionId);

  // Handle incoming WebSocket messages
  const handleWSMessage = useCallback(
    (message: ChatWSMessage) => {
      onMessage?.(message);

      if (message.type === 'message' && message.role === 'assistant') {
        if (message.streaming) {
          // Streaming message - accumulate content
          setIsStreaming(true);
          setStreamingMessage((prev) => prev + message.content);

          // Update message in cache if we have an ID
          if (streamingMessageIdRef.current) {
            updateMessage(streamingMessageIdRef.current, {
              content: streamingMessage + message.content,
            });
          }
        } else {
          // Complete message - add to cache
          setIsStreaming(false);
          const completeMessage: ChatMessageResponse = {
            id: Date.now(),
                                      session_id: sessionId!,
                                      role: 'assistant',
                                      content: message.content,
                                      tokens: 0,
                                      model_used: null,
                                      created_at: new Date().toISOString(),
          };

          addMessage(completeMessage);
          streamingMessageIdRef.current = completeMessage.id;
          setStreamingMessage('');
        }
      }

      if (message.type === 'error') {
        setIsStreaming(false);
        setStreamingMessage('');
        console.error('WebSocket error:', message.message);
      }
    },
    [sessionId, onMessage, addMessage, updateMessage, streamingMessage]
  );

  // Handle connection state changes
  const handleStateChange = useCallback(
    (state: WebSocketState) => {
      setConnectionState(state);
      onStateChange?.(state);
    },
    [onStateChange]
  );

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!sessionId) return;

    // Disconnect existing connection
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
    }

    // Create new WebSocket client
    const wsClient = new ChatWebSocketClient(sessionId, {
      autoReconnect: true,
      reconnectDelay: 3000,
      maxReconnectAttempts: 5,
    });

    // Subscribe to messages and state changes
    wsClient.onMessage(handleWSMessage);
    wsClient.onStateChange(handleStateChange);

    // Connect
    wsClient.connect();

    wsClientRef.current = wsClient;
  }, [sessionId, handleWSMessage, handleStateChange]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
      wsClientRef.current = null;
    }
    setConnectionState('disconnected');
    setIsStreaming(false);
    setStreamingMessage('');
  }, []);

  // Send a message through WebSocket
  const sendMessage = useCallback(
    (content: string) => {
      if (!wsClientRef.current) {
        console.error('WebSocket not connected');
        return;
      }

      try {
        wsClientRef.current.sendMessage(content);
        setStreamingMessage('');
        streamingMessageIdRef.current = null;
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    },
    []
  );

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && sessionId) {
      connect();
    }

    // Cleanup on unmount
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
