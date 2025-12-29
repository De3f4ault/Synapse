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
import { GridPattern } from "@/components/ui/grid-pattern";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MenuIcon, PanelLeftIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);

  // Auto-navigation hooks (via module public APIs)
  const { data: sessions = [], isLoading } = useChatSessions();
  const createSessionMutation = useCreateSession();

  // Voice mode check (via module public API)
  const isVoiceActive = useIsVoiceActive();

  // Load sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    if (saved) {
      setSidebarCollapsed(JSON.parse(saved));
    }
  }, []);

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

  // Toggle sidebar
  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", JSON.stringify(newState));
  };

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

  return (
    <ChatProviders sessionId={sessionId}>
      <div className="flex h-screen overflow-hidden nm-bg nm-constellation-bg">
        {/* Desktop Sidebar - Retractable */}
        <div
          className={cn(
            "hidden md:block transition-all duration-300 ease-in-out",
            sidebarCollapsed ? "w-0" : "w-64",
          )}
        >
          <div className={cn("h-full", sidebarCollapsed && "opacity-0")}>
            <ChatSidebar currentSessionId={sessionId} />
          </div>
        </div>

        {/* Mobile Sidebar (Drawer) */}
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent
            side="left"
            className="w-64 p-0 border-none [&>button]:hidden"
          >
            <ChatSidebar currentSessionId={sessionId} />
          </SheetContent>
        </Sheet>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden relative">
          {/* Floating Header Actions */}
          <div className="absolute top-4 left-4 z-50 flex items-center gap-2 pointer-events-none">
            {/* Desktop Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="hidden md:flex pointer-events-auto hover:bg-muted/50 rounded-full"
            >
              <PanelLeftIcon className="size-5 text-muted-foreground" />
            </Button>

            {/* Mobile Hamburger */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden pointer-events-auto hover:bg-muted/50 rounded-full"
            >
              <MenuIcon className="size-5 text-muted-foreground" />
            </Button>
          </div>

          {/* Chat Interface with Grid Background */}
          <div className="flex-1 overflow-hidden relative">
            <GridPattern className="pointer-events-none" />

            <div className="relative z-10 h-full">
              <ChatMain sessionId={sessionId} />
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
