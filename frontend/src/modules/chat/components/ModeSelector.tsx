/**
 * ModeSelector — Dropdown for selecting AI behavior mode
 * 
 * Modes:
 * - Socratic (🎓): Question-based teaching
 * - Direct (⚡): Fast, concise answers
 * - Deep Dive (🧠): Visible reasoning process
 * - Creative (✨): Brainstorming and writing
 */

import { useState, useRef, useEffect } from 'react';
import './ModeSelector.css';

// ==================== TYPES ====================

export interface Mode {
  id: string;
  name: string;
  icon: string;
  description: string;
  thinkingUi: 'off' | 'collapsed' | 'panel';
}

export interface ModeSelectorProps {
  /** Currently selected mode */
  selectedMode: string;
  /** Callback when mode changes */
  onModeChange: (modeId: string) => void;
  /** Available modes */
  modes?: Mode[];
  /** Whether selector is disabled */
  disabled?: boolean;
  /** Compact mode for toolbar */
  compact?: boolean;
}

// ==================== DEFAULT MODES ====================

const DEFAULT_MODES: Mode[] = [
  {
    id: 'socratic',
    name: 'Socratic Tutor',
    icon: '🎓',
    description: 'Question-based teaching',
    thinkingUi: 'collapsed',
  },
  {
    id: 'direct',
    name: 'Direct Answer',
    icon: '⚡',
    description: 'Fast, concise responses',
    thinkingUi: 'off',
  },
  {
    id: 'deep_dive',
    name: 'Deep Reasoning',
    icon: '🧠',
    description: 'Visible thinking process',
    thinkingUi: 'panel',
  },
  {
    id: 'creative',
    name: 'Creative',
    icon: '✨',
    description: 'Brainstorming & writing',
    thinkingUi: 'off',
  },
];

// ==================== COMPONENT ====================

export function ModeSelector({
  selectedMode,
  onModeChange,
  modes = DEFAULT_MODES,
  disabled = false,
  compact = false,
}: ModeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Find current mode
  const currentMode = modes.find(m => m.id === selectedMode) || modes[0];
  
  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);
  
  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);
  
  const handleSelect = (modeId: string) => {
    onModeChange(modeId);
    setIsOpen(false);
    
    // Persist preference
    try {
      localStorage.setItem('synapse_chat_mode', modeId);
    } catch {
      // Storage not available
    }
  };
  
  return (
    <div 
      ref={dropdownRef}
      className={`mode-selector ${compact ? 'mode-selector--compact' : ''} ${disabled ? 'mode-selector--disabled' : ''}`}
    >
      <button
        className="mode-selector__trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Current mode: ${currentMode.name}`}
      >
        <span className="mode-selector__icon">{currentMode.icon}</span>
        {!compact && (
          <span className="mode-selector__name">{currentMode.name}</span>
        )}
        <span className={`mode-selector__chevron ${isOpen ? 'mode-selector__chevron--open' : ''}`}>
          ▼
        </span>
      </button>
      
      {isOpen && (
        <ul 
          className="mode-selector__menu"
          role="listbox"
          aria-label="Select AI mode"
        >
          {modes.map((mode) => (
            <li
              key={mode.id}
              className={`mode-selector__option ${mode.id === selectedMode ? 'mode-selector__option--selected' : ''}`}
              role="option"
              aria-selected={mode.id === selectedMode}
              onClick={() => handleSelect(mode.id)}
            >
              <span className="mode-selector__option-icon">{mode.icon}</span>
              <div className="mode-selector__option-text">
                <span className="mode-selector__option-name">{mode.name}</span>
                <span className="mode-selector__option-desc">{mode.description}</span>
              </div>
              {mode.thinkingUi !== 'off' && (
                <span className="mode-selector__option-badge" title="Shows reasoning">
                  💭
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ==================== HOOK ====================

/**
 * Hook for managing mode state with persistence
 */
export function useMode(defaultMode: string = 'socratic') {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem('synapse_chat_mode') || defaultMode;
    } catch {
      return defaultMode;
    }
  });
  
  const setModeWithPersist = (newMode: string) => {
    setMode(newMode);
    try {
      localStorage.setItem('synapse_chat_mode', newMode);
    } catch {
      // Storage not available
    }
  };
  
  return [mode, setModeWithPersist] as const;
}

export default ModeSelector;
