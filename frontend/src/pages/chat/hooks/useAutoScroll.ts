/**
 * useAutoScroll - Smart scroll behavior
 * Automatically scrolls to bottom when new messages arrive
 * Respects user scrolling and manual scroll position
 */

import { useEffect, useState, useRef, RefObject } from 'react';

interface UseAutoScrollOptions {
  /**
   * Threshold (in pixels) from bottom to consider "at bottom"
   * Default: 100
   */
  threshold?: number;
  /**
   * Smooth scroll behavior
   * Default: true
   */
  smooth?: boolean;
}

export const useAutoScroll = (
  scrollRef: RefObject<HTMLElement>,
  options: UseAutoScrollOptions = {}
) => {
  const { threshold = 100, smooth = true } = options;
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const lastScrollTop = useRef(0);

  // Check if user is near bottom
  const checkIfNearBottom = () => {
    const element = scrollRef.current;
    if (!element) return false;

    const { scrollTop, scrollHeight, clientHeight } = element;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    return distanceFromBottom <= threshold;
  };

  // Handle scroll event
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const handleScroll = () => {
      const currentScrollTop = element.scrollTop;
      const scrollingUp = currentScrollTop < lastScrollTop.current;

      // If user scrolls up, disable auto-scroll
      if (scrollingUp) {
        setShouldAutoScroll(false);
      }
      // If user scrolls near bottom, enable auto-scroll
      else if (checkIfNearBottom()) {
        setShouldAutoScroll(true);
      }

      lastScrollTop.current = currentScrollTop;
    };

    element.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      element.removeEventListener('scroll', handleScroll);
    };
  }, [scrollRef, threshold]);

  // Scroll to bottom function
  const scrollToBottom = (force = false) => {
    const element = scrollRef.current;
    if (!element) return;

    if (force || shouldAutoScroll) {
      element.scrollTo({
        top: element.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  };

  return {
    shouldAutoScroll,
    scrollToBottom,
    setShouldAutoScroll,
  };
};
