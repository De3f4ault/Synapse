/**
 * EditorModeSwitch - Page/Edgeless Mode Toggle
 *
 * Provides the mode toggle UI like official AFFiNE:
 * - Page mode (document icon) - for rich text documents
 * - Edgeless mode (canvas icon) - for mindmaps, shapes, connectors
 * - Alt+S keyboard shortcut
 *
 * Compatible with BlockSuite v0.19.5
 */

import { useEffect, useCallback } from "react";
import { FileText, Layout } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================================================
// Types
// ============================================================================

export type EditorMode = "page" | "edgeless";

export interface EditorModeSwitchProps {
  /** Current editor mode */
  mode: EditorMode;
  /** Callback when mode changes */
  onModeChange: (mode: EditorMode) => void;
  /** Whether the switch is disabled */
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function EditorModeSwitch({
  mode,
  onModeChange,
  disabled = false,
}: EditorModeSwitchProps) {
  
  // ----------------------------------------------------------------
  // Keyboard Shortcut (Alt+S)
  // ----------------------------------------------------------------
  
  const toggleMode = useCallback(() => {
    if (disabled) return;
    const newMode = mode === "page" ? "edgeless" : "page";
    onModeChange(newMode);
  }, [mode, onModeChange, disabled]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+S to toggle mode
      if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        toggleMode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleMode]);

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        {/* Page Mode Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => !disabled && onModeChange("page")}
              disabled={disabled}
              className={`
                flex items-center justify-center w-8 h-8 rounded-md transition-all
                ${mode === "page"
                  ? "bg-[#2d2d2d] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-300 hover:bg-[#2a2a2a]"
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              aria-label="View in Page mode"
            >
              <FileText size={18} strokeWidth={1.5} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="flex items-center gap-2">
            <span>View in Page mode</span>
            <kbd className="px-1.5 py-0.5 text-xs bg-black/50 rounded border border-white/20">
              Alt S
            </kbd>
          </TooltipContent>
        </Tooltip>

        {/* Edgeless Mode Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => !disabled && onModeChange("edgeless")}
              disabled={disabled}
              className={`
                flex items-center justify-center w-8 h-8 rounded-md transition-all
                ${mode === "edgeless"
                  ? "bg-[#2d2d2d] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-300 hover:bg-[#2a2a2a]"
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              aria-label="View in Edgeless Canvas"
            >
              <Layout size={18} strokeWidth={1.5} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="flex items-center gap-2">
            <span>View in Edgeless Canvas</span>
            <kbd className="px-1.5 py-0.5 text-xs bg-black/50 rounded border border-white/20">
              Alt S
            </kbd>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export default EditorModeSwitch;
