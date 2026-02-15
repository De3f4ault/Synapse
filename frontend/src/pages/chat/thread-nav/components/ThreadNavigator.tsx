/**
 * ThreadNavigator — DeepSeek-Style Thread Navigation
 *
 * Standalone module rendered at the ChatPage level.
 * Fetches messages independently via useChatMessages (shared React Query cache).
 * Finds the scroll container via data attribute on the DOM.
 *
 * Two-level hover interaction:
 *   Level 0: Thin bars — user messages wider, AI thin dashes
 *   Level 1: Rail hover → user message cards expand with preview text
 *   Level 2: Card hover → detail popup with fuller content
 *
 * Active message tracked via IntersectionObserver, highlighted in cyan.
 * Chevrons directly adjacent to bar cluster, hidden until rail hover.
 * All bars laid flat — no scrollbar.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useChatMessages } from "../../core/hooks/useChatMessages";
import type { ChatMessageResponse } from "@/api/generated";
import "./ThreadNavigator.css";

// =============================================================================
// Types
// =============================================================================

interface ThreadNavigatorProps {
  sessionId: number;
}

interface DetailPopup {
  y: number;
  rightEdge: number; /* viewport-relative right position for fixed element */
  content: string;
  isActive: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

function truncateContent(content: string, maxLen: number): string {
  if (!content) return "";
  const clean = content
    .replace(/```[\s\S]*?```/g, "[code]")
    .replace(/!\[.*?\]\(.*?\)/g, "[image]")
    .replace(/\[([^\]]+)\]\(.*?\)/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n+/g, " ")
    .trim();
  return clean.length > maxLen ? clean.slice(0, maxLen) + "…" : clean;
}

/**
 * Find the chat messages scroll container in the DOM.
 * We use a data attribute rather than prop drilling refs across modules.
 */
function getScrollContainer(): HTMLElement | null {
  return document.querySelector('[data-scroll-container="chat-messages"]');
}

// =============================================================================
// Component
// =============================================================================

export function ThreadNavigator({ sessionId }: ThreadNavigatorProps) {
  const { data: messages = [] } = useChatMessages(sessionId);

  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [detailPopup, setDetailPopup] = useState<DetailPopup | null>(null);
  const visibilityMapRef = useRef<Map<number, number>>(new Map());

  // All messages with real IDs
  const allMessages = useMemo(
    () => messages.filter((m: ChatMessageResponse) => m.id > 0),
    [messages],
  );

  // User message indices — for chevron navigation
  const userIndices = useMemo(
    () =>
      allMessages
        .map((m: ChatMessageResponse, i: number) =>
          m.role === "user" ? i : -1,
        )
        .filter((i: number) => i !== -1),
    [allMessages],
  );

  const totalMessages = allMessages.length;
  const isVisible = totalMessages >= 3;

  // =========================================================================
  // IntersectionObserver — Track active message via scroll position
  // =========================================================================

  useEffect(() => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer || allMessages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const map = visibilityMapRef.current;

        entries.forEach((entry) => {
          const idAttr = entry.target.getAttribute("data-message-id");
          if (!idAttr) return;
          const id = parseInt(idAttr, 10);
          const index = allMessages.findIndex(
            (msg: ChatMessageResponse) => msg.id === id,
          );

          if (index !== -1) {
            if (entry.isIntersecting) {
              map.set(index, entry.intersectionRatio);
            } else {
              map.delete(index);
            }
          }
        });

        // Highest visibility ratio wins
        let maxRatio = 0;
        let maxIndex = -1;
        map.forEach((ratio, idx) => {
          if (ratio > maxRatio) {
            maxRatio = ratio;
            maxIndex = idx;
          }
        });

        if (maxIndex !== -1) {
          setActiveIndex(maxIndex);
        }
      },
      {
        root: scrollContainer,
        rootMargin: "-15% 0px -15% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    // Observe all messages
    allMessages.forEach((msg: ChatMessageResponse) => {
      const el = scrollContainer.querySelector(
        `[data-message-id="${msg.id}"]`,
      );
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
      visibilityMapRef.current.clear();
    };
  }, [allMessages]);

  // =========================================================================
  // Navigation
  // =========================================================================

  const scrollToMessage = useCallback(
    (index: number) => {
      const msg = allMessages[index];
      if (!msg) return;
      const scrollContainer = getScrollContainer();
      if (!scrollContainer) return;

      const el = scrollContainer.querySelector(
        `[data-message-id="${msg.id}"]`,
      );
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [allMessages],
  );

  // Jump to prev/next USER message
  const goToPrev = useCallback(() => {
    const idx = userIndices.findIndex((i) => i >= activeIndex);
    const prevIdx =
      idx > 0 ? userIndices[idx - 1] : userIndices[userIndices.length - 1];
    if (prevIdx !== undefined && prevIdx !== activeIndex) {
      scrollToMessage(prevIdx);
    }
  }, [activeIndex, userIndices, scrollToMessage]);

  const goToNext = useCallback(() => {
    const idx = userIndices.findIndex((i) => i > activeIndex);
    if (idx !== -1) {
      const nextIdx = userIndices[idx];
      if (nextIdx !== undefined) scrollToMessage(nextIdx);
    }
  }, [activeIndex, userIndices, scrollToMessage]);

  const isAtFirstUser = userIndices.findIndex((i) => i < activeIndex) === -1;
  const isAtLastUser = userIndices.findIndex((i) => i > activeIndex) === -1;

  // =========================================================================
  // Keyboard
  // =========================================================================

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        goToPrev();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        goToNext();
      }
    },
    [goToPrev, goToNext],
  );

  // =========================================================================
  // Detail popup — second-level hover on a specific card
  // =========================================================================

  const handleCardHover = useCallback(
    (index: number, e: React.MouseEvent) => {
      const msg = allMessages[index];
      if (!msg) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setDetailPopup({
        y: rect.top + rect.height / 2,
        rightEdge: window.innerWidth - rect.left + 8, /* position popup to the LEFT of the card */
        content: truncateContent(msg.content || "", 120),
        isActive: index === activeIndex,
      });
    },
    [allMessages, activeIndex],
  );

  // =========================================================================
  // Render
  // =========================================================================

  if (!isVisible) return null;

  return (
    <div
      className={`thread-navigator ${isVisible ? "visible" : ""}`}
      role="navigation"
      aria-label={`Thread navigation: ${totalMessages} messages`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Up chevron — directly adjacent to first bar */}
      <button
        className="thread-nav-chevron"
        onClick={goToPrev}
        disabled={isAtFirstUser}
        aria-label="Previous message"
      >
        <ChevronUp />
      </button>

      {/* Bar track — all messages laid flat */}
      <div className="thread-nav-track">
        {allMessages.map((msg: ChatMessageResponse, index: number) => {
          const isUser = msg.role === "user";
          const isActive = index === activeIndex;

          return (
            <div
              key={msg.id}
              className={`thread-nav-row role-${msg.role}`}
              onClick={() => scrollToMessage(index)}
            >
              {/* Bar — always visible */}
              <div
                className={[
                  "thread-nav-bar",
                  `role-${msg.role}`,
                  isActive ? "active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              />

              {/* Card — shown on rail hover for user messages only */}
              {isUser && (
                <div
                  className={`thread-nav-card ${isActive ? "active" : ""}`}
                  onMouseEnter={(e) => handleCardHover(index, e)}
                  onMouseLeave={() => setDetailPopup(null)}
                >
                  <span className="thread-nav-card-text">
                    {truncateContent(msg.content || "", 40)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Down chevron — directly adjacent to last bar */}
      <button
        className="thread-nav-chevron"
        onClick={goToNext}
        disabled={isAtLastUser}
        aria-label="Next message"
      >
        <ChevronDown />
      </button>

      {/* Detail popup — appears on card hover (second-level) */}
      {detailPopup && (
        <div
          className={`thread-nav-detail show ${detailPopup.isActive ? "active-detail" : ""}`}
          style={{
            top: `${detailPopup.y}px`,
            transform: "translateY(-50%)",
            right: `${detailPopup.rightEdge}px`,
          }}
        >
          <div className="thread-nav-detail-label">You</div>
          <div className="thread-nav-detail-content">
            {detailPopup.content || "…"}
          </div>
        </div>
      )}
    </div>
  );
}

export default ThreadNavigator;
