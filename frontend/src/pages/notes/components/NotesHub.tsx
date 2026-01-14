import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, PanelLeftIcon, MenuIcon } from "lucide-react";
import { AuroraBackground, EmptyState } from "@/shared/ui";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { NotesSidebar } from "./NotesSidebar";
import { NotesDock } from "./NotesDock";
 
import type { NoteResponse } from "@/modules/notes/core";

// We need to import NoteCard and NoteListItem, but I previously exported them from modules/notes/index.ts
// Let's use the module index import
import { NoteCard as NoteCardComponent, NoteListItem as NoteListItemComponent } from "@/modules/notes";


interface NotesHubProps {
    notes: NoteResponse[];
    isLoading: boolean;
    viewMode: "grid" | "list";
    onViewChange: (mode: "grid" | "list") => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    activeFilter: string;
    onFilterChange: (filter: string) => void;
    onCreate: () => void;
    onNoteClick: (id: number) => void;
}

export const NotesHub = ({
    notes,
    isLoading,
    viewMode,
    onViewChange,
    searchQuery,
    onSearchChange,
    activeFilter,
    onFilterChange,
    onCreate,
    onNoteClick
}: NotesHubProps) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    // Load sidebar state from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("notesSidebarCollapsed");
        if (saved) {
            setSidebarCollapsed(JSON.parse(saved));
        }
    }, []);

    const toggleSidebar = () => {
        const newState = !sidebarCollapsed;
        setSidebarCollapsed(newState);
        localStorage.setItem("notesSidebarCollapsed", JSON.stringify(newState));
    };

    // Extract unique tags
    const tags = useMemo(() => {
        const tagSet = new Set<string>();
        notes.forEach((note: any) => {
             // Assuming note.tags is array of objects {name: string} or strings
             if (Array.isArray(note.tags)) {
                 note.tags.forEach((t: any) => tagSet.add(t.name || t));
             }
        });
        return Array.from(tagSet);
    }, [notes]);

    return (
        <AuroraBackground className="fixed inset-0 min-h-screen flex flex-col pt-16" fixed>
            <div className="flex flex-1 overflow-hidden">
                {/* Desktop Sidebar */}
                <div
                    className={cn(
                        "hidden lg:block transition-all duration-300 ease-in-out relative z-10 py-4 pl-3",
                        sidebarCollapsed ? "w-0 p-0" : "w-[17rem]",
                    )}
                >
                    <NotesSidebar
                        activeFilter={activeFilter}
                        onFilterChange={onFilterChange}
                        totalNotes={notes.length}
                        tags={tags}
                        onCreate={onCreate}
                        className="w-full h-full rounded-2xl"
                        isCollapsed={sidebarCollapsed}
                    />
                </div>

                {/* Mobile Sidebar */}
                <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                    <SheetContent
                        side="left"
                        className="w-64 p-0 border-none [&>button]:hidden bg-[#050505]/95 backdrop-blur-xl"
                    >
                        <NotesSidebar
                            activeFilter={activeFilter}
                            onFilterChange={onFilterChange}
                            totalNotes={notes.length}
                            tags={tags}
                            onCreate={onCreate}
                            className="w-64"
                        />
                    </SheetContent>
                </Sheet>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden relative z-0">
                     {/* Toggle Button */}
                    <div className="absolute top-4 left-4 z-50 flex items-center gap-2 pointer-events-none">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleSidebar}
                            className="hidden lg:flex pointer-events-auto hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors"
                        >
                            <PanelLeftIcon className="size-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMobileSidebarOpen(true)}
                            className="lg:hidden pointer-events-auto hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors"
                        >
                            <MenuIcon className="size-5" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 pb-32 relative scrollbar-hide">
                         {/* Header/Context */}
                        <div className="max-w-[1600px] mx-auto">
                            <div className="mb-8 pt-2 pl-12 lg:pl-0">
                                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                                    {activeFilter === "All" ? "All Notes" : activeFilter}
                                </h1>
                                <p className="text-slate-400">Capture and organize your ideas.</p>
                            </div>

                             <AnimatePresence mode="wait">
                                {isLoading ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                                    >
                                        {[...Array(8)].map((_, i) => (
                                            <div key={i} className="h-64 rounded-2xl bg-white/5 animate-pulse" />
                                        ))}
                                    </motion.div>
                                ) : notes.length > 0 ? (
                                    viewMode === "grid" ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                            {notes.map((note) => (
                                                <NoteCardComponent
                                                    key={note.id}
                                                    note={note}

                                                    onClick={() => onNoteClick(note.id)}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-3 max-w-4xl">
                                             {notes.map((note) => (
                                                <NoteListItemComponent
                                                    key={note.id}
                                                    note={note}
                                                    onClick={() => onNoteClick(note.id)}
                                                />
                                            ))}
                                        </div>
                                    )
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="mt-20 flex justify-center"
                                    >
                                        <EmptyState
                                            icon={<FileText className="w-16 h-16 text-slate-700" />}
                                            title="No notes found"
                                            description={searchQuery ? "Try adjusting your search terms" : "Create your first note to get started"}
                                            action={{
                                                label: "Create First Note",
                                                onClick: onCreate
                                            }}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            <NotesDock 
                viewMode={viewMode}
                onViewChange={onViewChange}
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
                onCreate={onCreate}
            />
        </AuroraBackground>
    );
};
