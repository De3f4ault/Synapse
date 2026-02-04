/**
 * ChatPage is an orchestration boundary.
 * It must never own state, logic, or side effects.
 *
 * Responsibilities:
 * ✅ Read route params
 * ✅ Decide which modules are active
 * ✅ Wire modules together via public APIs only
 *
 * Forbidden:
 * ❌ Zustand selectors (beyond composition)
 * ❌ React Query hooks (beyond routing)
 * ❌ WebSocket logic
 * ❌ Message mutation
 * ❌ UI conditionals beyond layout
 */

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

// Module public APIs only - no deep imports
import { ChatSidebar } from "./sidebar";
import { ChatMain, useChatSessions, useCreateSession } from "./core";
import { useIsVoiceActive, LiveVoiceOverlay } from "./voice";

// Layout and providers
import { ChatProviders } from "./ChatProviders";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MenuIcon } from "lucide-react";

// ==================== ROUTE HOOK ====================

function useChatRoute() {
  const { sessionId } = useParams<{ sessionId: string }>();
  return {
    sessionId: sessionId ? parseInt(sessionId) : undefined,
    rawSessionId: sessionId,
  };
}

// ==================== CHAT PAGE ====================

export const ChatPage: React.FC = () => {
  const { sessionId } = useChatRoute();
  const navigate = useNavigate();

  // UI state (local only - not domain state)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);

  // Auto-navigation hooks (via module public APIs)
  const { data: sessions = [], isLoading } = useChatSessions();
  const createSessionMutation = useCreateSession();

  // Voice mode check (via module public API)
  const isVoiceActive = useIsVoiceActive();



  // Ref to track if session creation is in progress
  const creatingSessionRef = useRef(false);

  // Auto-navigation logic
  useEffect(() => {
    if (isLoading) return;

    if (!sessionId) {
      if (sessions.length > 0) {
        // Sort by updated_at DESC and redirect to latest
        const sortedSessions = [...sessions].sort((a, b) => {
          const aDate = new Date(a.updated_at || a.created_at).getTime();
          const bDate = new Date(b.updated_at || b.created_at).getTime();
          return bDate - aDate;
        });
        const latest = sortedSessions[0];
        if (latest) {
          navigate(`/chat/${latest.id}`, { replace: true });
        }
      } else if (!creatingSessionRef.current && !createSessionMutation.isPending) {
        // No sessions exist - create first one
        creatingSessionRef.current = true;
        createSessionMutation.mutate(
          { title: "New Conversation" },
          {
            onSuccess: (newSession: { id: number }) => {
              navigate(`/chat/${newSession.id}`, { replace: true });
            },
            onSettled: () => {
              creatingSessionRef.current = false;
            },
          },
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, sessions, isLoading, navigate]);



  // Loading state
  if (isLoading || !sessionId) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  // ==================== RENDER ====================
  // Pattern copied EXACTLY from DocumentsHub.tsx
  return (
    <ChatProviders sessionId={sessionId}>
      <div className="fixed inset-0 min-h-screen flex flex-col pt-16 bg-[#050505]">
        <div className="flex flex-1 overflow-hidden">
          {/* Desktop Sidebar - Expandable */}
          <div className="hidden lg:flex h-full">
            <ChatSidebar currentSessionId={sessionId} />
          </div>

          {/* Mobile Sidebar (Drawer) */}
          <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
            <SheetContent
              side="left"
              className="w-72 p-0 border-none [&>button]:hidden bg-[#050505]/95 backdrop-blur-xl"
            >
              <ChatSidebar currentSessionId={sessionId} />
            </SheetContent>
          </Sheet>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden relative z-0">
            {/* Mobile Hamburger - Only visible on small screens */}
            <div className="absolute top-4 left-4 z-50 lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileSidebarOpen(true)}
                className="hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors"
              >
                <MenuIcon className="size-5" />
              </Button>
            </div>

            {/* Chat Content */}
            <div className="flex-1 flex flex-col min-h-0 relative">
              <ChatMain 
                sessionId={sessionId} 
                sessionTitle={sessions.find(s => s.id === sessionId)?.title}
              />
            </div>
          </div>
        </div>

        {/* Voice Mode Overlay */}
        <LiveVoiceOverlay
          isOpen={voiceOverlayOpen || isVoiceActive}
          onClose={() => setVoiceOverlayOpen(false)}
        />
      </div>
    </ChatProviders>
  );
};

export default ChatPage;
