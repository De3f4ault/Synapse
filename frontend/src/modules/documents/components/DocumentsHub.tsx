import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FolderOpen, PanelLeftIcon, MenuIcon } from "lucide-react";
import { AuroraBackground, EmptyState } from "@/shared/ui";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { EnhancedDocument } from "../core/types";
import { DocumentGrid } from "./DocumentGrid";
import { DocumentsDock } from "./DocumentsDock";
import { DocumentsList } from "./DocumentsList";
import { DocumentsSidebar } from "./DocumentsSidebar";
import { useThumbnails } from "../hooks/useThumbnails";

interface DocumentsHubProps {
    documents: EnhancedDocument[];
    isLoading: boolean;
    viewMode: "grid" | "list";
    onViewChange: (mode: "grid" | "list") => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    activeFilter: string;
    onFilterChange: (filter: string) => void;
    onUpload: () => void;
    onDocumentClick?: (doc: EnhancedDocument) => void;
}

export const DocumentsHub = ({
    documents,
    isLoading,
    viewMode,
    onViewChange,
    searchQuery,
    onSearchChange,
    activeFilter,
    onFilterChange,
    onUpload,
    onDocumentClick
}: DocumentsHubProps) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    // Load sidebar state from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("documentsSidebarCollapsed");
        if (saved) {
            setSidebarCollapsed(JSON.parse(saved));
        }
    }, []);

    const toggleSidebar = () => {
        const newState = !sidebarCollapsed;
        setSidebarCollapsed(newState);
        localStorage.setItem("documentsSidebarCollapsed", JSON.stringify(newState));
    };

    // Batch fetch thumbnails for visible documents
    const documentIds = documents.map(d => d.id);
    const { data: thumbnails } = useThumbnails(documentIds);

    // Extract unique sectors from documents for the sidebar
    const sectors = Array.from(new Set(documents.map(d => d.sector))).filter(Boolean);

    return (
        <AuroraBackground className="fixed inset-0 min-h-screen flex flex-col pt-16" fixed>
            <div className="flex flex-1 overflow-hidden">
                {/* Desktop Sidebar - Standardized Collapsible Pattern */}
                <div
                    className={cn(
                        "hidden lg:block transition-all duration-300 ease-in-out relative z-10 py-4 pl-3",
                        sidebarCollapsed ? "w-0 p-0" : "w-[17rem]",
                    )}
                >
                    <DocumentsSidebar
                        activeSector={activeFilter}
                        onSectorChange={onFilterChange}
                        totalDocuments={documents.length}
                        sectors={sectors}
                        onUpload={onUpload}
                        className="w-full h-full rounded-2xl"
                        isCollapsed={sidebarCollapsed}
                    />
                </div>

                {/* Mobile Sidebar (Drawer) */}
                <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                    <SheetContent
                        side="left"
                        className="w-64 p-0 border-none [&>button]:hidden bg-[#050505]/95 backdrop-blur-xl"
                    >
                        <DocumentsSidebar
                            activeSector={activeFilter}
                            onSectorChange={onFilterChange}
                            totalDocuments={documents.length}
                            sectors={sectors}
                            onUpload={onUpload}
                            className="w-64"
                        />
                    </SheetContent>
                </Sheet>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden relative z-0">
                    {/* Standardized Floating Sidebar Toggle */}
                    <div className="absolute top-4 left-4 z-50 flex items-center gap-2 pointer-events-none">
                        {/* Desktop Toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleSidebar}
                            className="hidden lg:flex pointer-events-auto hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors"
                        >
                            <PanelLeftIcon className="size-5" />
                        </Button>

                        {/* Mobile Hamburger */}
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
                        <div className="max-w-[1600px] mx-auto">
                            <div className="mb-8 pt-2 pl-12 lg:pl-0">
                                {/* Breadcrumb / Title Context */}
                                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                                    {activeFilter === "All" ? "All Documents" : activeFilter}
                                </h1>
                                <p className="text-slate-400">Manage and organize your knowledge base.</p>
                            </div>

                            <AnimatePresence mode="wait">
                                {isLoading ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
                                    >
                                        {[...Array(10)].map((_, i) => (
                                            <div key={i} className="h-[280px] rounded-2xl bg-white/5 animate-pulse" />
                                        ))}
                                    </motion.div>
                                ) : documents.length > 0 ? (
                                    viewMode === "grid" ? (
                                        <DocumentGrid
                                            key="grid"
                                            documents={documents}
                                            onDocumentClick={onDocumentClick}
                                            thumbnails={thumbnails || {}}
                                        />
                                    ) : (
                                        <DocumentsList key="list" documents={documents} />
                                    )
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="mt-20"
                                    >
                                        <EmptyState
                                            icon={FolderOpen}
                                            title="No documents found"
                                            description={searchQuery ? "Try adjusting your search terms" : "Upload your first document to get started"}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Dock */}
            <DocumentsDock
                viewMode={viewMode}
                onViewChange={onViewChange}
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
                activeFilter={activeFilter}
                onFilterChange={onFilterChange}
                onUpload={onUpload}
            />
        </AuroraBackground>
    );
};
