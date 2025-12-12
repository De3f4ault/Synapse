/**
 * useKeyboardShortcuts - Cmd+K, Cmd+N, etc.
 * Global keyboard shortcuts for chat interface
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // Cmd on Mac, Win on Windows
  action: () => void;
  description: string;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  onNewChat?: () => void;
  onToggleSidebar?: () => void;
  onSearch?: () => void;
  onFocusInput?: () => void;
}

export const useKeyboardShortcuts = (options: UseKeyboardShortcutsOptions = {}) => {
  const {
    enabled = true,
    onNewChat,
    onToggleSidebar,
    onSearch,
    onFocusInput,
  } = options;

  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? event.metaKey : event.ctrlKey;

      // Ignore if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Cmd+N even in inputs
        if (!(modKey && event.key === 'n')) {
          return;
        }
      }

      // Cmd/Ctrl + N: New chat
      if (modKey && event.key === 'n') {
        event.preventDefault();
        onNewChat?.();
        navigate('/chat');
      }

      // Cmd/Ctrl + K: Search/Command palette
      if (modKey && event.key === 'k') {
        event.preventDefault();
        onSearch?.();
      }

      // Cmd/Ctrl + B: Toggle sidebar
      if (modKey && event.key === 'b') {
        event.preventDefault();
        onToggleSidebar?.();
      }

      // Cmd/Ctrl + /: Focus input
      if (modKey && event.key === '/') {
        event.preventDefault();
        onFocusInput?.();
      }

      // Escape: Clear focus
      if (event.key === 'Escape') {
        (document.activeElement as HTMLElement)?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, navigate, onNewChat, onToggleSidebar, onSearch, onFocusInput]);

  // Return available shortcuts for documentation
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'N',
      meta: true,
      action: () => onNewChat?.(),
      description: 'New conversation',
    },
    {
      key: 'K',
      meta: true,
      action: () => onSearch?.(),
      description: 'Search / Command palette',
    },
    {
      key: 'B',
      meta: true,
      action: () => onToggleSidebar?.(),
      description: 'Toggle sidebar',
    },
    {
      key: '/',
      meta: true,
      action: () => onFocusInput?.(),
      description: 'Focus input',
    },
    {
      key: 'Escape',
      action: () => {},
      description: 'Clear focus',
    },
  ];

  return { shortcuts };
};
