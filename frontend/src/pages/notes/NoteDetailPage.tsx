/**
 * BlockSuite Note Detail Page
 *
 * Full-screen immersive BlockSuite editor experience.
 * Local-first: No API sync, docs persist via IndexedDB.
 *
 * ============================================================================
 * ARCHITECTURE: LOCAL-FIRST (Phase 1)
 * ============================================================================
 */

import { useCallback, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, List, Layers, FileText, Sparkles } from "lucide-react";
import type { AffineEditorContainer } from "@blocksuite/presets";
import { cn } from "@/lib/utils";

// Module imports (BlockSuite Engine)
import { BlockSuiteContainer, useBlockSuiteDoc, extractDocTitle } from "@/modules/notes";
import { EditorModeSwitch } from "@/modules/notes/engine/EditorModeSwitch";
import { EditorRightSidebar } from "@/modules/notes/engine/EditorRightSidebar";
import type { EditorMode } from "@/modules/notes/engine/EditorModeSwitch";
import type { SidebarTab } from "@/modules/notes/engine/EditorRightSidebar";
import { AISidebar } from "@/modules/notes/engine/AISidebar";

// Shared UI
import { Button } from "@/components/ui/button";

export function NoteDetailPage() {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();

  // Editor mode and sidebar state
  const [mode, setMode] = useState<EditorMode>("page");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("outline");
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
  
  // Editor reference for sidebar
  const [editorInstance, setEditorInstance] = useState<AffineEditorContainer | null>(null);

  // ============================================================================
  // BlockSuite Engine Hook (Local-First)
  // ============================================================================

  const { doc, isLoading } = useBlockSuiteDoc({
    docId: noteId || "new",
  });

  // Extract title from doc content
  const noteTitle = useMemo(() => {
    if (!doc) return "Untitled Note";
    return extractDocTitle(doc) || "Untitled Note";
  }, [doc]);

  // ============================================================================
  // Editor Instance Callback
  // ============================================================================

  const handleEditorReady = useCallback((editor: AffineEditorContainer) => {
    setEditorInstance(editor);
  }, []);

  // ============================================================================
  // Sidebar Tab Click Handler
  // ============================================================================

  const handleTabClick = (tab: SidebarTab) => {
    if (sidebarTab === tab && sidebarOpen) {
      setSidebarOpen(false);
    } else {
      setSidebarTab(tab);
      setSidebarOpen(true);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  // Loading State
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-12 w-12 animate-spin text-cyan-400" />
      </div>
    );
  }

  // Full-Screen BlockSuite Editor with Floating Controls
  return (
    <div className="fixed inset-0 bg-[#0a0a0a]">
      {/* ================================================================== */}
      {/* FLOATING CONTROLS - No header bar, just button groups */}
      {/* ================================================================== */}
      
      {/* Left: Back Button + Mode Switch (Floating Group) */}
      <div className="fixed top-4 left-4 z-50 flex items-center gap-1 bg-[#1a1a1a]/80 backdrop-blur-sm border border-white/10 rounded-lg p-1 pointer-events-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/notes")}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white hover:bg-white/5 rounded-md px-3 py-1.5 h-8"
        >
          <ArrowLeft size={14} />
          <span>Notes</span>
        </Button>

        <div className="w-px h-4 bg-white/10 mx-1" />

        {/* Mode Switch */}
        <EditorModeSwitch
          mode={mode}
          onModeChange={setMode}
        />
      </div>

      {/* Center: Note Title (Floating) - No interaction */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
        <span className="flex items-center justify-center text-sm font-medium text-slate-400 bg-[#1a1a1a]/80 backdrop-blur-sm px-6 py-1.5 rounded-lg border border-white/10 h-10 shadow-sm">
          {noteTitle}
        </span>
      </div>

      {/* Right: Sidebar Toggle Buttons (Floating) */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-1 bg-[#1a1a1a]/80 backdrop-blur-sm border border-white/10 rounded-lg p-1 pointer-events-auto">
        <button
          type="button"
          title="Outline / TOC"
          onClick={() => handleTabClick("outline")}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-md transition-all",
            sidebarTab === "outline" && sidebarOpen
              ? "bg-cyan-500/20 text-cyan-400"
              : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
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
            sidebarTab === "frames" && sidebarOpen
              ? "bg-cyan-500/20 text-cyan-400"
              : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
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
            sidebarTab === "properties" && sidebarOpen
              ? "bg-cyan-500/20 text-cyan-400"
              : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
          )}
        >
          <FileText size={18} strokeWidth={1.5} />
        </button>

        <div className="w-px h-4 bg-white/10 mx-1" />

        {/* AI Sidebar Toggle */}
        <button
          type="button"
          title="AI Assistant"
          onClick={() => setAiSidebarOpen(!aiSidebarOpen)}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-md transition-all",
            aiSidebarOpen
              ? "bg-cyan-500/20 text-cyan-400"
              : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
          )}
        >
          <Sparkles size={18} strokeWidth={1.5} />
        </button>
      </div>

      {/* ================================================================== */}
      {/* FULL-SCREEN BLOCKSUITE EDITOR */}
      {/* ================================================================== */}
      
      <div 
        className="h-full w-full transition-all duration-300 relative z-0"
        style={{
          paddingRight: sidebarOpen ? "288px" : "0",
        }}
      >
        {doc && (
          <BlockSuiteContainer
            doc={doc}
            mode={mode}
            className="h-full w-full"
            onEditorReady={handleEditorReady}
          />
        )}
      </div>

      {/* Right Sidebar */}
      <EditorRightSidebar
        editor={editorInstance}
        isOpen={sidebarOpen}
        onOpenChange={setSidebarOpen}
        activeTab={sidebarTab}
        onTabChange={setSidebarTab}
      />

      {/* AI Sidebar */}
      <AISidebar
        isOpen={aiSidebarOpen}
        onClose={() => setAiSidebarOpen(false)}
      />
    </div>
  );
}

export default NoteDetailPage;
