/**
 * Right Sidebar - BlockSuite Panel Container
 *
 * Provides the right sidebar with BlockSuite panels like:
 * - Outline/TOC panel
 * - Frame panel (for presentations)
 * 
 * Compatible with BlockSuite v0.19.5
 */

import { useEffect, useRef } from "react";
import { List, Layers, X } from "lucide-react";
import type { AffineEditorContainer } from "@blocksuite/presets";

// ============================================================================
// Types
// ============================================================================

export type SidebarTab = "outline" | "frames" | null;

export interface RightSidebarProps {
  /** Reference to the AffineEditorContainer instance */
  editor: AffineEditorContainer | null;
  /** Whether the sidebar is open */
  isOpen: boolean;
  /** Callback when sidebar open state changes */
  onOpenChange: (open: boolean) => void;
  /** Currently active tab */
  activeTab: SidebarTab;
  /** Callback when active tab changes */
  onTabChange: (tab: SidebarTab) => void;
}

// ============================================================================
// Sidebar Toggle Buttons Component (for header)
// ============================================================================

export function SidebarToggleButtons({
  isOpen,
  onOpenChange,
  activeTab,
  onTabChange,
}: Omit<RightSidebarProps, "editor">) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-[#1e1e1e] p-1 border border-white/10">
      {/* Outline Panel Button */}
      <button
        type="button"
        title="Outline / TOC"
        onClick={() => {
          if (activeTab === "outline" && isOpen) {
            onOpenChange(false);
          } else {
            onTabChange("outline");
            onOpenChange(true);
          }
        }}
        className={`
          flex items-center justify-center w-8 h-8 rounded-md transition-all
          ${activeTab === "outline" && isOpen
            ? "bg-[#2d2d2d] text-white shadow-sm"
            : "text-slate-500 hover:text-slate-300 hover:bg-[#2a2a2a]"
          }
        `}
        aria-label="Toggle outline panel"
      >
        <List size={18} strokeWidth={1.5} />
      </button>

      {/* Frames Panel Button */}
      <button
        type="button"
        title="Frames"
        onClick={() => {
          if (activeTab === "frames" && isOpen) {
            onOpenChange(false);
          } else {
            onTabChange("frames");
            onOpenChange(true);
          }
        }}
        className={`
          flex items-center justify-center w-8 h-8 rounded-md transition-all
          ${activeTab === "frames" && isOpen
            ? "bg-[#2d2d2d] text-white shadow-sm"
            : "text-slate-500 hover:text-slate-300 hover:bg-[#2a2a2a]"
          }
        `}
        aria-label="Toggle frames panel"
      >
        <Layers size={18} strokeWidth={1.5} />
      </button>
    </div>
  );
}

// ============================================================================
// Sidebar Panel Component
// ============================================================================

export function RightSidebar({
  editor,
  isOpen,
  onOpenChange,
  activeTab,
  onTabChange,
}: RightSidebarProps) {
  const panelContainerRef = useRef<HTMLDivElement>(null);

  // ----------------------------------------------------------------
  // Mount BlockSuite panels when editor is ready
  // ----------------------------------------------------------------

  useEffect(() => {
    if (!editor || !isOpen || !panelContainerRef.current) return;

    // Clear previous panel
    panelContainerRef.current.innerHTML = "";

    if (activeTab === "outline") {
      // Create and mount outline panel
      const outlinePanel = document.createElement("affine-outline-panel") as any;
      outlinePanel.editor = editor;
      outlinePanel.style.height = "100%";
      outlinePanel.style.display = "block";
      panelContainerRef.current.appendChild(outlinePanel);
    } else if (activeTab === "frames") {
      // Create and mount frame panel
      const framePanel = document.createElement("affine-frame-panel") as any;
      framePanel.editor = editor;
      framePanel.style.height = "100%";
      framePanel.style.display = "block";
      panelContainerRef.current.appendChild(framePanel);
    }

    return () => {
      if (panelContainerRef.current) {
        panelContainerRef.current.innerHTML = "";
      }
    };
  }, [editor, isOpen, activeTab]);

  // Don't render if not open
  if (!isOpen) return null;

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------

  return (
    <div
      className="fixed top-0 right-0 bottom-0 w-80 bg-[#1a1a1a] border-l border-white/10 z-40 flex flex-col"
      data-theme="dark"
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <span className="text-sm font-medium text-white">
          {activeTab === "outline" ? "Outline" : "Frames"}
        </span>
        <button
          onClick={() => onOpenChange(false)}
          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Panel Content */}
      <div 
        ref={panelContainerRef}
        className="flex-1 overflow-hidden"
        data-theme="dark"
      />
    </div>
  );
}

export default RightSidebar;
