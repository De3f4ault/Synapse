/**
 * BlockNote-Native Note Detail Page
 *
 * Document-style editor using BlockNote as the canonical editing engine.
 * Synapse provides identity (cyberpunk UI). BlockNote provides capability.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Columns,
  FileText,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import type {
  Block,
  BlockNoteEditor as BlockNoteEditorType,
} from "@blocknote/core";

// Module imports
import {
  BlockNoteEditor,
  EditorToolbar,
  AIInsightsPanel,
  useNoteAI,
  blockNoteAdapter,
  type ToolDockAction,
} from "@/modules/notes";

// API hooks
import { useNote, useUpdateNote, useDeleteNote } from "@/api/hooks/useNotes";

// Shared UI
import { AuroraBackground } from "@/shared/ui";
import { Button } from "@/components/ui/button";

// Autosave delay
const AUTOSAVE_DELAY_MS = 1500;

export function NoteDetailPage() {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const numericNoteId = noteId ? parseInt(noteId) : 0;

  // Editor ref for accessing BlockNote instance
  const editorRef = useRef<BlockNoteEditorType | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);

  // State
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [originalTitle, setOriginalTitle] = useState("");
  const [originalBlocks, setOriginalBlocks] = useState<Block[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [splitView, setSplitView] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);

  // Stats derived from blocks
  const stats = blockNoteAdapter.computeStats(blocks);

  // Fetch note data
  const { data: note, isLoading, error } = useNote(numericNoteId);
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();

  // AI from module
  const {
    isProcessing: aiIsProcessing,
    currentAction: aiAction,
    insights: aiInsights,
    summarize,
    generateTags,
  } = useNoteAI();

  // Initialize editor when note loads
  useEffect(() => {
    if (note) {
      setTitle(note.title || "");
      setOriginalTitle(note.title || "");

      // Convert stored content to BlockNote blocks
      const loadedBlocks = blockNoteAdapter.fromStorageFormat(note.content);
      setBlocks(loadedBlocks);
      setOriginalBlocks(loadedBlocks);
      setIsDirty(false);
    }
  }, [note?.id]);

  // Track dirty state
  useEffect(() => {
    const titleChanged = title !== originalTitle;
    const blocksChanged =
      JSON.stringify(blocks) !== JSON.stringify(originalBlocks);
    setIsDirty(titleChanged || blocksChanged);
  }, [title, blocks, originalTitle, originalBlocks]);

  // Auto-resize title
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = "auto";
      titleRef.current.style.height = titleRef.current.scrollHeight + "px";
    }
  }, [title]);

  // Autosave effect
  useEffect(() => {
    if (!isDirty || isAutosaving) return;

    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
    }

    autosaveTimer.current = setTimeout(async () => {
      await save();
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, [isDirty, title, blocks]);

  // Save function
  const save = useCallback(async () => {
    if (!isDirty || !numericNoteId) return;

    setIsAutosaving(true);
    try {
      const content = blockNoteAdapter.toStorageFormat(blocks);
      await updateNoteMutation.mutateAsync({
        noteId: numericNoteId,
        data: { title, content },
      });
      setOriginalTitle(title);
      setOriginalBlocks(blocks);
      setIsDirty(false);
    } catch (error) {
      toast.error("Failed to save note");
    } finally {
      setIsAutosaving(false);
    }
  }, [isDirty, numericNoteId, title, blocks, updateNoteMutation]);

  // Handle block changes from BlockNote
  const handleBlocksChange = useCallback((newBlocks: Block[]) => {
    setBlocks(newBlocks);
  }, []);

  // Toggle mode
  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === "edit" ? "view" : "edit"));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault();
        toggleMode();
      }
      if (e.key === "Escape") {
        navigate("/notes");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [save, toggleMode, navigate]);

  // Handle toolbar actions
  const handleAction = async (action: ToolDockAction) => {
    switch (action) {
      case "toggle_edit":
        toggleMode();
        break;

      case "save":
        save();
        break;

      case "ai_summarize":
        try {
          // Extract plain text from blocks for AI
          const plainText = blocks
            .map((b) => {
              if (b.content && Array.isArray(b.content)) {
                return b.content
                  .map((c) =>
                    typeof c === "object" && "text" in c ? c.text : "",
                  )
                  .join("");
              }
              return "";
            })
            .join("\n");
          await summarize(plainText);
          setShowAIPanel(true);
          toast.success("Summary generated");
        } catch {
          toast.error("Failed to generate summary");
        }
        break;

      case "ai_tags":
        try {
          const plainText = blocks
            .map((b) => {
              if (b.content && Array.isArray(b.content)) {
                return b.content
                  .map((c) =>
                    typeof c === "object" && "text" in c ? c.text : "",
                  )
                  .join("");
              }
              return "";
            })
            .join("\n");
          const tags = await generateTags(title, plainText);
          setShowAIPanel(true);
          toast.success(`Generated ${tags.length} tags`);
        } catch {
          toast.error("Failed to generate tags");
        }
        break;

      case "delete":
        if (window.confirm("Delete this note permanently?")) {
          deleteNoteMutation.mutate(numericNoteId, {
            onSuccess: () => navigate("/notes"),
          });
        }
        break;
    }
  };

  // Handle saving AI insights to note
  const handleSaveToNote = (insightContent: string) => {
    // Append as a new paragraph block
    const newBlock: Block = {
      id: crypto.randomUUID(),
      type: "paragraph",
      content: [{ type: "text", text: insightContent }],
      children: [],
    } as unknown as Block;
    setBlocks([...blocks, newBlock]);
  };

  // Loading state
  if (isLoading) {
    return (
      <AuroraBackground className="fixed inset-0 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-cyan-400" />
      </AuroraBackground>
    );
  }

  // Error state
  if (error || !note) {
    return (
      <AuroraBackground className="fixed inset-0 flex flex-col items-center justify-center">
        <AlertCircle className="mb-4 h-16 w-16 text-red-400" />
        <h2 className="mb-2 text-xl font-bold text-white">Note Not Found</h2>
        <Button
          variant="outline"
          onClick={() => navigate("/notes")}
          className="flex items-center gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10"
        >
          <ArrowLeft size={16} />
          Back to Notes
        </Button>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground
        className="fixed inset-0 flex h-screen flex-col overflow-hidden" 
        fixed
    >
      {/* Glass Header */}
      <div className="z-10 flex items-center justify-between border-b border-white/5 bg-[#050505]/50 px-6 py-4 backdrop-blur-xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/notes")}
          className="group flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
            <ArrowLeft size={16} />
            <span className="font-medium">Back to Notes</span>
        </Button>

        <div className="flex items-center gap-3">
          {/* Status */}
          {isDirty && (
            <span className="rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-xs font-medium text-amber-400">
              Unsaved changes
            </span>
          )}
          {isAutosaving && (
            <span className="flex items-center gap-1 rounded-md border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-xs font-medium text-cyan-400">
              <Loader2 size={12} className="animate-spin" />
              Saving...
            </span>
          )}

          {/* Split View Toggle */}
          <Button
            variant={splitView ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => setSplitView(!splitView)}
            title="Toggle split view"
          >
            <Columns size={16} className={splitView ? "text-cyan-400" : "text-slate-400"} />
          </Button>

          {/* Note Stats - Block-based */}
          <div className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/5 px-3 py-1.5 text-xs text-slate-500 font-mono">
            <FileText size={12} />
            <span>{stats.words} words</span>
            <span className="text-slate-600">•</span>
            <span>{stats.blocks} blocks</span>
          </div>
        </div>
      </div>

      {/* Editor Area */}
      <div className="relative flex-1 overflow-hidden">
        <div className="scrollbar-hide h-full overflow-y-auto">
          <div className="mx-auto max-w-[1600px] px-8 md:px-12 py-12 pb-40">
            {/* Title Input */}
            <textarea
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              className="mb-8 w-full resize-none border-none bg-transparent text-5xl font-bold text-white caret-cyan-400 outline-none placeholder:text-slate-600"
              rows={1}
              disabled={mode === "view"}
            />

            {/* BlockNote Editor */}
            <div className="note-editor-wrapper">
                <BlockNoteEditor
                initialBlocks={blocks}
                onChange={handleBlocksChange}
                editable={mode === "edit"}
                editorRef={editorRef}
                placeholder="Start writing..."
                />
            </div>

            {/* Neural Activity Indicator */}
            {mode === "edit" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute bottom-24 right-8 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-cyan-400 pointer-events-none"
              >
                <Zap size={12} className="animate-pulse" />
                <span>BlockNote Active</span>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Toolbar */}
      <div className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2">
        <EditorToolbar
          mode={mode}
          onAction={handleAction}
          isProcessing={aiIsProcessing}
          hasUnsavedChanges={isDirty}
          isSaving={updateNoteMutation.isPending}
        />
      </div>

      {/* AI Insights Panel */}
      <AIInsightsPanel
        insights={aiInsights}
        isOpen={showAIPanel}
        onClose={() => setShowAIPanel(false)}
        onSaveToNote={handleSaveToNote}
      />

      {/* AI Processing Overlay */}
      <AnimatePresence>
        {aiIsProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-[#1e2024] p-8 shadow-2xl">
              <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
              <p className="text-sm font-medium text-slate-300">
                {aiAction === "summarize" && "Generating summary..."}
                {aiAction === "tags" && "Generating tags..."}
                {aiAction === "expand" && "Expanding content..."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuroraBackground>
  );
}

