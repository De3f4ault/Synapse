import { useState, useCallback, useRef } from "react";

interface UseStreamingMessageOptions {
  /** Called when streaming starts */
  onStart?: () => void;
  /** Called with each chunk */
  onChunk?: (content: string) => void;
  /** Called with each thinking chunk */
  onThinkingChunk?: (thinking: string) => void;
  /** Called when streaming completes */
  onComplete?: (fullContent: string, thinkingContent: string) => void;
}

/**
 * Hook for managing streaming message state with thinking transparency.
 * Accumulates chunks and provides both response and thinking content.
 */
export function useStreamingMessage(options?: UseStreamingMessageOptions) {
  const [content, setContent] = useState("");
  const [thinkingContent, setThinkingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const contentRef = useRef("");
  const thinkingRef = useRef("");

  const startStreaming = useCallback(() => {
    setContent("");
    setThinkingContent("");
    contentRef.current = "";
    thinkingRef.current = "";
    setIsStreaming(true);
    options?.onStart?.();
  }, [options]);

  const appendChunk = useCallback(
    (chunk: string) => {
      contentRef.current += chunk;
      setContent(contentRef.current);
      options?.onChunk?.(chunk);
    },
    [options],
  );

  const appendThinking = useCallback(
    (chunk: string) => {
      thinkingRef.current += chunk;
      setThinkingContent(thinkingRef.current);
      options?.onThinkingChunk?.(chunk);
    },
    [options],
  );

  const completeStreaming = useCallback(() => {
    setIsStreaming(false);
    options?.onComplete?.(contentRef.current, thinkingRef.current);
  }, [options]);

  const reset = useCallback(() => {
    setContent("");
    setThinkingContent("");
    contentRef.current = "";
    thinkingRef.current = "";
    setIsStreaming(false);
  }, []);

  const handleChunk = useCallback(
    (chunk: { content: string; done: boolean; type?: 'token' | 'thinking' }) => {
      if (chunk.done) {
        completeStreaming();
      } else {
        if (!isStreaming && chunk.content) {
          startStreaming();
        }
        // Route based on chunk type
        if (chunk.type === 'thinking') {
          appendThinking(chunk.content);
        } else {
          appendChunk(chunk.content);
        }
      }
    },
    [isStreaming, startStreaming, appendChunk, appendThinking, completeStreaming],
  );

  return {
    /** Current accumulated content */
    content,
    /** Current accumulated thinking content */
    thinkingContent,
    /** Whether streaming is in progress */
    isStreaming,
    /** Start a new streaming session */
    startStreaming,
    /** Append a chunk to the content */
    appendChunk,
    /** Append a thinking chunk */
    appendThinking,
    /** Mark streaming as complete */
    completeStreaming,
    /** Reset to initial state */
    reset,
    /** Handle a chunk from WebSocket (convenience method) */
    handleChunk,
  };
}

/**
 * Hook for typing animation effect.
 * Displays content character by character.
 */
export function useTypingEffect(
  fullText: string,
  speed: number = 20,
  enabled: boolean = true,
) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(0);

  const startTyping = useCallback(() => {
    if (!enabled || !fullText) return;

    setIsTyping(true);
    indexRef.current = 0;
    setDisplayedText("");

    intervalRef.current = setInterval(() => {
      if (indexRef.current < fullText.length) {
        setDisplayedText(fullText.slice(0, indexRef.current + 1));
        indexRef.current += 1;
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setIsTyping(false);
      }
    }, speed);
  }, [fullText, speed, enabled]);

  const skipToEnd = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setDisplayedText(fullText);
    setIsTyping(false);
  }, [fullText]);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setDisplayedText("");
    setIsTyping(false);
    indexRef.current = 0;
  }, []);

  return {
    displayedText,
    isTyping,
    startTyping,
    skipToEnd,
    reset,
  };
}

export default useStreamingMessage;
