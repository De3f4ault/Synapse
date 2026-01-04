import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Grid,
  List as ListIcon,
  Network,
  Loader2,
  FileText,
  Search,
  X,
  BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Module imports (from @/modules/notes)
import { NoteTree, NoteCard, NoteStats, useNotesList } from "@/modules/notes";

// API hooks for mutations
import { useCreateNote, useDeleteNote } from "@/api/hooks/useNotes";
import { NeumorphicCard } from "@/components/neumorphic";

/**
 * NotesPage - Main notes hub
 * Orchestrates list, search, and navigation using modules/notes
 */
export function NotesPage() {
  const navigate = useNavigate();
  const [showStats, setShowStats] = useState(false);

  // List state from module
  const {
    notes,
    treeNotes,
    isLoading,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    selectedId,
    setSelectedId,
    expandedIds,
    toggleExpanded,
    expandRoots,
    collapseAll,
  } = useNotesList();

  // Mutations
  const createNoteMutation = useCreateNote();
  const deleteNoteMutation = useDeleteNote();

  // Handlers
  const handleCreateNote = () => {
    createNoteMutation.mutate(
      {
        title: "New Fragment",
        content: " ",
        tags: [],
      },
      {
        onSuccess: (data: any) => {
          navigate(`/notes/${data.id}`);
        },
      },
    );
  };

  const handleSelectNote = (id: number) => {
    setSelectedId(id);
    navigate(`/notes/${id}`);
  };

  const handleDeleteNote = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Archive this fragment permanently?")) {
      deleteNoteMutation.mutate(id);
    }
  };

  return (
    <div className="relative min-h-screen nm-bg nm-constellation-bg overflow-hidden flex flex-col">
      <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

      {/* Top Bar: Search */}
      <div className="flex-none pt-8 pb-4 px-8 bg-gradient-to-b from-[#0a0a0f] via-[#0a0a0f]/90 to-transparent z-30">
        <div className="max-w-xl mx-auto">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-cyan-400 transition-colors">
              <Search size={18} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes or filter by tag..."
              className="w-full h-12 bg-[#0f0f16] border border-white/10 rounded-full pl-12 pr-12 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-4 flex items-center text-slate-500 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-8 pt-0 pb-32">
        {/* Collapsible Stats Section */}
        <AnimatePresence>
          {showStats && notes && notes.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-8"
            >
              <NoteStats notes={notes} />
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
          </div>
        ) : notes && notes.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-2xl nm-inset flex items-center justify-center text-slate-600 mb-6 border border-white/5">
              <FileText size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No notes yet</h3>
            <p className="text-slate-400 mb-6 max-w-xs">
              Create your first note to start building your knowledge base.
            </p>
            <button
              onClick={handleCreateNote}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus size={18} strokeWidth={3} />
              Create Note
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {viewMode === "tree" && treeNotes && (
                <NeumorphicCard className="p-6">
                  <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">
                      Knowledge Graph
                    </h2>
                    <div className="flex gap-3 text-xs">
                      <button
                        onClick={expandRoots}
                        className="text-slate-500 hover:text-cyan-400 transition-colors font-medium"
                      >
                        Expand All
                      </button>
                      <span className="text-white/10">|</span>
                      <button
                        onClick={collapseAll}
                        className="text-slate-500 hover:text-cyan-400 transition-colors font-medium"
                      >
                        Collapse All
                      </button>
                    </div>
                  </div>
                  <NoteTree
                    items={treeNotes}
                    selectedId={selectedId}
                    expandedIds={expandedIds}
                    toggleExpand={toggleExpanded}
                    onSelect={handleSelectNote}
                    onDelete={handleDeleteNote}
                  />
                </NeumorphicCard>
              )}

              {viewMode === "grid" && notes && (
                <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
                  {notes.map((note: any, index: number) => (
                    <div key={note.id} className="break-inside-avoid mb-6">
                      <NoteCard
                        note={note}
                        onClick={() => handleSelectNote(note.id)}
                        index={index}
                      />
                    </div>
                  ))}
                </div>
              )}

              {viewMode === "list" && notes && (
                <div className="space-y-4 max-w-4xl mx-auto">
                  {notes.map((note: any, index: number) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onClick={() => handleSelectNote(note.id)}
                      index={index}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 flex flex-col items-end gap-3 z-40">
        {/* View Toggles (Mini FABs) */}
        <div className="flex items-center gap-2 mb-2 p-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
          <button
            onClick={() => setViewMode("tree")}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
              viewMode === "tree"
                ? "bg-white/10 text-cyan-400"
                : "text-slate-500 hover:text-slate-300",
            )}
            title="Tree View"
          >
            <Network size={18} />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
              viewMode === "grid"
                ? "bg-white/10 text-cyan-400"
                : "text-slate-500 hover:text-slate-300",
            )}
            title="Grid View"
          >
            <Grid size={18} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
              viewMode === "list"
                ? "bg-white/10 text-cyan-400"
                : "text-slate-500 hover:text-slate-300",
            )}
            title="List View"
          >
            <ListIcon size={18} />
          </button>
        </div>

        {/* Stats Toggle Step FAB */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowStats(!showStats)}
          className={cn(
            "h-12 px-5 rounded-full backdrop-blur-md border shadow-lg flex items-center gap-2 transition-all font-medium text-sm group",
            showStats
              ? "bg-purple-500/20 border-purple-500/50 text-purple-200"
              : "bg-[#13151a]/80 border-white/10 text-slate-400 hover:text-white",
          )}
        >
          <BarChart2
            size={18}
            className={
              showStats
                ? "text-purple-400"
                : "text-slate-500 group-hover:text-white"
            }
          />
          {showStats ? "Hide Stats" : "Stats"}
        </motion.button>

        {/* Create Note FAB (Primary) */}
        <motion.button
          whileHover={{
            scale: 1.05,
            boxShadow: "0 0 25px rgba(6,182,212,0.4)",
          }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCreateNote}
          disabled={createNoteMutation.isPending}
          className="h-14 px-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xl shadow-cyan-500/20 flex items-center gap-2 font-bold tracking-wide text-base transition-all disabled:opacity-70"
        >
          {createNoteMutation.isPending ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Plus size={20} strokeWidth={3} />
          )}
          New Note
        </motion.button>
      </div>
    </div>
  );
}
