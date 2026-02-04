import { useEffect, useCallback, useRef, useState, useMemo } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { AIExtension } from "@blocknote/xl-ai";
import { PartialBlock } from "@blocknote/core";
import { en } from "@blocknote/core/locales";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import { Note } from "../../../domain/note.types";
import { NotesRepository } from "../../../infrastructure/notes.repository";
import { schema } from "../editor/blocknote.schema";
import { uploadFile } from "./uploadFile";

const DEBOUNCE_DELAY_MS = 1000;

// SSE Event Parser for backend stream
function parseSSEEvent(chunk: string): { type: string; text?: string; message?: string } | null {
  try {
    // Handle multiple events in one chunk
    const lines = chunk.split('\n').filter(line => line.trim());
    for (const line of lines) {
      if (line.startsWith('data:')) {
        const jsonStr = line.slice(5).trim();
        if (jsonStr) {
          return JSON.parse(jsonStr);
        }
      }
    }
    // Fallback: try parsing entire chunk as JSON
    return JSON.parse(chunk);
  } catch {
    // Raw text fallback
    return { type: 'token', text: chunk };
  }
}

export function useTextNote(note: Note) {
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(false);

  // 1. Parse Initial Content
  const initialContent = useMemo(() => {
    try {
      if (!note.content) return undefined;
      const parsed = typeof note.content === 'string' 
        ? JSON.parse(note.content) 
        : note.content;
      
      return Array.isArray(parsed) ? (parsed as PartialBlock[]) : undefined;
    } catch (e) {
      console.error("Failed to parse note content:", e);
      return undefined;
    }
  }, [note.content]);

  // 2. AI Extension with Custom Backend Transport
  const aiExtension = useMemo(() => {
    return AIExtension({
      // @ts-ignore - Transport typing matches Vercel AI SDK structure
      transport: {
        sendMessages: async ({ messages }: { messages: any[] }) => {
          // Debug: Log the message structure from BlockNote AI SDK
          console.log("[Notes AI] Messages received:", JSON.stringify(messages, null, 2));
          
          // Extract content - try different possible locations
          const lastMessage = messages[messages.length - 1];
          const prompt = lastMessage?.content || lastMessage?.text || lastMessage?.message || JSON.stringify(lastMessage);
          
          console.log("[Notes AI] Extracted prompt:", prompt);
          
          // Get token from synapse-auth storage (zustand persist format)
          let token: string | null = null;
          try {
            const authData = localStorage.getItem('synapse-auth');
            if (authData) {
              const parsed = JSON.parse(authData);
              token = parsed?.state?.token || null;
            }
          } catch {
            console.error("Failed to parse auth data");
          }
          
          if (!token) {
            console.error("No auth token available for AI request");
            return new ReadableStream({ start(c) { c.close(); } });
          }
          
          try {
            // Use SSE streaming endpoint for real-time token streaming
            const response = await fetch(`/api/v1/chat/sessions/notes/stream`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ content: prompt })
            });

            if (!response.ok || !response.body) {
              const errorBody = await response.text();
              console.error("AI Request Failed:", response.status, errorBody);
              throw new Error(`AI Stream Failed: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            return new ReadableStream({
              async start(controller) {
                try {
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value, { stream: true });
                    // Parse SSE events (may contain multiple events)
                    const events = chunk.split('\n\n').filter(e => e.trim());
                    
                    for (const eventStr of events) {
                      const event = parseSSEEvent(eventStr) as any;
                      if (!event) continue;
                      
                      if (event.type === 'message-start') {
                        console.log("[Notes AI] Message started:", event.id);
                      } else if (event.type === 'text-delta' && event.textDelta) {
                        // Vercel AI SDK format: { type: 'text-delta', textDelta: 'content' }
                        controller.enqueue({
                          type: 'text-delta',
                          delta: event.textDelta,
                          id: 'ai-response',
                        });
                      } else if (event.type === 'finish') {
                        console.log("[Notes AI] Stream finished:", event.finishReason);
                      } else if (event.type === 'error') {
                        console.error("[Notes AI] Stream error:", event.error);
                        controller.error(new Error(event.error || 'Unknown error'));
                        return;
                      }
                    }
                  }
                  controller.close();
                } catch (e) {
                  controller.error(e);
                }
              }
            });
          } catch (e) {
            console.error("Transport Error", e);
            return new ReadableStream({ start(c) { c.close(); } });
          }
        }
      } 
    });
  }, []);

  // 3. Editor Creation with AI locale
  const editor = useCreateBlockNote({
    schema,
    initialContent,
    uploadFile, 
    dictionary: {
      ...en,
      ai: aiEn, // AI menu translations
    },
    // @ts-ignore - Extension types mismatch in some versions
    extensions: [aiExtension],
  });
  


  // 3. Change Detection & Persistence
  const handleChange = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Mark as saving immediately for UI feedback (optional)
    setIsSaving(true);

    saveTimeoutRef.current = setTimeout(async () => {
      // Capture the strictly current document state
      const content = editor.document;
      
      try {
        await NotesRepository.updateNote(note.id, {
          content: JSON.stringify(content), // Serialize for dumb persistence
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Failed to auto-save note:", err);
        // TODO: Add error state / toast
      } finally {
        if (isMounted.current) {
          setIsSaving(false);
        }
      }
    }, DEBOUNCE_DELAY_MS);
  }, [editor, note.id]);

  // Attach the change listener
  useEffect(() => {
    isMounted.current = true;
    const unsubscribe = editor.onChange(handleChange);
    return () => {
      isMounted.current = false;
      unsubscribe();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [editor, handleChange]);

  return {
    editor,
    isSaving
  };
}
