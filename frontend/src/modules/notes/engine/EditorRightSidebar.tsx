/**
 * EditorRightSidebar - Notes Editor Right Sidebar
 *
 * Custom right sidebar for the BlockSuite editor using Synapse's UI components.
 * Provides:
 * - Outline/TOC panel with heading navigation
 * - Frames panel for edgeless presentations
 * - Properties panel for document metadata
 *
 * Uses Synapse's glass theme and existing sidebar patterns.
 */

import { useCallback } from "react";
import { 
  List, 
  Layers, 
  FileText, 
  ChevronRight,
  X,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AffineEditorContainer } from "@blocksuite/presets";
import { useBlockSuiteOutline } from "./useBlockSuiteOutline";
import type { OutlineHeading, OutlineFrame } from "./useBlockSuiteOutline";

// ============================================================================
// Types
// ============================================================================

export type SidebarTab = "outline" | "frames" | "properties";

export interface EditorRightSidebarProps {
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
// Header Toggle Buttons (for use in page header)
// ============================================================================

export interface SidebarToggleButtonsProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
}

export function SidebarToggleButtons({
  isOpen,
  onOpenChange,
  activeTab,
  onTabChange,
}: SidebarToggleButtonsProps) {
  const handleTabClick = (tab: SidebarTab) => {
    if (activeTab === tab && isOpen) {
      onOpenChange(false);
    } else {
      onTabChange(tab);
      onOpenChange(true);
    }
  };

  return (
    <div className="flex items-center gap-1 rounded-lg bg-[#1e1e1e] p-1 border border-white/10">
      <button
        type="button"
        title="Outline / TOC"
        onClick={() => handleTabClick("outline")}
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-md transition-all",
          activeTab === "outline" && isOpen
            ? "bg-[#2d2d2d] text-cyan-400 shadow-sm"
            : "text-slate-500 hover:text-slate-300 hover:bg-[#2a2a2a]"
        )}
      >
        <List size={18} strokeWidth={1.5} />
      </button>

      <button
        type="button"
        title="Frames"
        onClick={() => handleTabClick("frames")}
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-md transition-all",
          activeTab === "frames" && isOpen
            ? "bg-[#2d2d2d] text-cyan-400 shadow-sm"
            : "text-slate-500 hover:text-slate-300 hover:bg-[#2a2a2a]"
        )}
      >
        <Layers size={18} strokeWidth={1.5} />
      </button>

      <button
        type="button"
        title="Properties"
        onClick={() => handleTabClick("properties")}
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-md transition-all",
          activeTab === "properties" && isOpen
            ? "bg-[#2d2d2d] text-cyan-400 shadow-sm"
            : "text-slate-500 hover:text-slate-300 hover:bg-[#2a2a2a]"
        )}
      >
        <FileText size={18} strokeWidth={1.5} />
      </button>
    </div>
  );
}

// ============================================================================
// Outline Panel
// ============================================================================

interface OutlinePanelProps {
  headings: OutlineHeading[];
  onHeadingClick: (blockId: string) => void;
}

function OutlinePanel({ headings, onHeadingClick }: OutlinePanelProps) {
  if (headings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-sm">
        <Hash size={32} className="mb-2 opacity-50" />
        <p>No headings found</p>
        <p className="text-xs mt-1">Add headings to see the outline</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {headings.map((heading) => (
        <button
          key={heading.id}
          onClick={() => onHeadingClick(heading.blockId)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left",
            "text-slate-300 hover:text-white hover:bg-white/5",
            "transition-colors duration-150"
          )}
          style={{ paddingLeft: `${(heading.level - 1) * 12 + 12}px` }}
        >
          <ChevronRight size={14} className="text-slate-600 shrink-0" />
          <span className={cn(
            "truncate",
            heading.level === 1 && "font-semibold",
            heading.level === 2 && "font-medium",
            heading.level >= 3 && "text-sm"
          )}>
            {heading.text}
          </span>
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Frames Panel
// ============================================================================

interface FramesPanelProps {
  frames: OutlineFrame[];
  onFrameClick: (blockId: string) => void;
}

function FramesPanel({ frames, onFrameClick }: FramesPanelProps) {
  if (frames.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-sm">
        <Layers size={32} className="mb-2 opacity-50" />
        <p>No frames found</p>
        <p className="text-xs mt-1">Add frames in edgeless mode</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {frames.map((frame, index) => (
        <button
          key={frame.id}
          onClick={() => onFrameClick(frame.blockId)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left",
            "text-slate-300 hover:text-white hover:bg-white/5",
            "transition-colors duration-150"
          )}
        >
          <div className="w-6 h-6 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-medium shrink-0">
            {index + 1}
          </div>
          <span className="truncate">{frame.title}</span>
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Properties Panel
// ============================================================================

interface PropertiesPanelProps {
  title: string;
  createdAt?: Date;
  updatedAt?: Date;
}

function PropertiesPanel({ title, createdAt, updatedAt }: PropertiesPanelProps) {
  const formatDate = (date?: Date) => {
    if (!date) return "—";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs text-slate-500 uppercase tracking-wider">Title</label>
        <p className="text-sm text-white">{title || "Untitled"}</p>
      </div>
      
      <div className="space-y-2">
        <label className="text-xs text-slate-500 uppercase tracking-wider">Created</label>
        <p className="text-sm text-slate-400">{formatDate(createdAt)}</p>
      </div>
      
      <div className="space-y-2">
        <label className="text-xs text-slate-500 uppercase tracking-wider">Last Modified</label>
        <p className="text-sm text-slate-400">{formatDate(updatedAt)}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Sidebar Component
// ============================================================================

export function EditorRightSidebar({
  editor,
  isOpen,
  onOpenChange,
  activeTab,
  onTabChange,
}: EditorRightSidebarProps) {
  const { headings, frames, properties, isLoading } = useBlockSuiteOutline(editor);

  // ----------------------------------------------------------------
  // Navigation handlers
  // ----------------------------------------------------------------

  const handleHeadingClick = useCallback((blockId: string) => {
    if (!editor?.host) return;
    
    // Scroll to the block in the editor
    const block = editor.host.view.getBlock(blockId);
    if (block) {
      block.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [editor]);

  const handleFrameClick = useCallback((blockId: string) => {
    if (!editor?.host) return;
    
    // Navigate to frame in edgeless mode
    const block = editor.host.view.getBlock(blockId);
    if (block) {
      block.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [editor]);

  // ----------------------------------------------------------------
  // Tab titles
  // ----------------------------------------------------------------

  const tabTitles: Record<SidebarTab, string> = {
    outline: "Outline",
    frames: "Frames",
    properties: "Properties",
  };

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------

  if (!isOpen) return null;

  return (
    <div
      className="fixed top-4 right-4 bottom-4 w-72 bg-zinc-950/95 backdrop-blur-xl border border-white/10 z-40 flex flex-col rounded-2xl shadow-2xl"
      data-theme="dark"
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        {/* Tab Switcher */}
        <div className="flex items-center gap-1">
          {(["outline", "frames", "properties"] as SidebarTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                activeTab === tab
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              )}
            >
              {tabTitles[tab]}
            </button>
          ))}
        </div>

        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="p-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === "outline" && (
              <OutlinePanel 
                headings={headings} 
                onHeadingClick={handleHeadingClick} 
              />
            )}
            {activeTab === "frames" && (
              <FramesPanel 
                frames={frames} 
                onFrameClick={handleFrameClick} 
              />
            )}
            {activeTab === "properties" && (
              <PropertiesPanel 
                title={properties.title}
                createdAt={properties.createdAt}
                updatedAt={properties.updatedAt}
              />
            )}
          </>
        )}
      </div>

      {/* Footer Hint */}
      <div className="p-3 border-t border-white/5 shrink-0">
        <p className="text-xs text-slate-600 text-center">
          {activeTab === "outline" && "Click headings to navigate"}
          {activeTab === "frames" && "Click frames to navigate"}
          {activeTab === "properties" && "Document properties"}
        </p>
      </div>
    </div>
  );
}

export default EditorRightSidebar;
