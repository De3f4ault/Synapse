import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Grid, AlignLeft, Upload, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import hooks
import { useDocuments } from './hooks/useDocuments';
import { useDocumentUpload } from './hooks/useDocumentUpload';
import { useDocumentViewer } from './hooks/useDocumentViewer';

// Import components
import { DocumentGrid } from './components/list/DocumentGrid';
import { DocumentTable } from './components/list/DocumentTable';
import { UploadArea } from './components/upload/UploadArea';
import { UploadProgress } from './components/upload/UploadProgress';
import { DocumentViewer } from './components/viewer/DocumentViewer';
import { FloatingPageDock } from '@/components/layout/FloatingPageDock';

// Import types
import type { ViewMode, DocumentSector } from './types/documents.types';

/**
 * OMNI-KINETIC Documents Interface (v7.2)
 * Refactored with modular component structure
 */

const SECTORS: DocumentSector[] = ['All', 'Classified', 'Dev', 'Assets', 'System', 'Logs'];



/**
 * Main Documents Page Component
 */
export function DocumentsPage() {
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [activeSector, setActiveSector] = useState<DocumentSector>('All');
    const [search, setSearch] = useState('');
    const [uploadMode, setUploadMode] = useState(false);

    const logAction = (msg: string) => console.log('DOC_LOG:', msg);



    // Hooks
    const { documents, isLoading, deleteDocument } = useDocuments();
    const { uploadProgress, getRootProps, getInputProps, isDragActive } = useDocumentUpload({
        logAction,
    });
    const { selectedDocument, isViewerOpen, openViewer, closeViewer } = useDocumentViewer();

    // Filter documents
    const filtered = documents.filter(
        (d) =>
            (activeSector === 'All' || d.sector === activeSector) &&
            d.filename.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col relative overflow-hidden nm-bg nm-constellation-bg">
            {/* Minimal Header (Optional, purely for context if needed, or rely on content interactions) */}
            <div className="p-6 pb-0">
                <h1 className="text-3xl font-bold tracking-tight text-foreground/20 select-none">Documents</h1>
            </div>

            {/* Upload Area (Overlay) */}
            <AnimatePresence>
                {uploadMode && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute inset-0 z-30 bg-background/90 backdrop-blur-sm p-8 flex flex-col"
                    >
                        <div className="flex justify-between items-center mb-6 max-w-4xl mx-auto w-full">
                            <h3 className="text-xl font-bold">Upload Files</h3>
                            <button onClick={() => setUploadMode(false)} className="p-2 hover:bg-muted rounded-full transition-colors"><X size={24} /></button>
                        </div>
                        <div className="flex-1 max-w-4xl mx-auto w-full">
                            <UploadArea
                                getRootProps={getRootProps}
                                getInputProps={getInputProps}
                                isDragActive={isDragActive}
                                onCancel={() => setUploadMode(false)}
                            />
                            <div className="mt-6">
                                <UploadProgress uploadProgress={uploadProgress} />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-6 pt-4 pb-24">
                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                        <p className="text-muted-foreground">Loading archives...</p>
                    </div>
                ) : (viewMode === 'grid' ? (
                    <DocumentGrid
                        documents={filtered}
                        isLoading={isLoading}
                        onSelect={openViewer}
                        onDelete={deleteDocument}
                        logAction={logAction}
                    />
                ) : (
                    <DocumentTable
                        documents={filtered}
                        isLoading={isLoading}
                        onSelect={openViewer}
                        onDelete={deleteDocument}
                        logAction={logAction}
                    />
                )
                )}
            </div>

            {/* Floating Dock */}
            <FloatingPageDock className="justify-between">
                {/* Search */}
                <div className="relative flex-1 max-w-md group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        value={search}
                        placeholder="Search archives..."
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-10 bg-transparent border-none outline-none pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus:ring-0"
                    />
                </div>

                <div className="h-6 w-px bg-border mx-2" />

                {/* Filters (Sectors) - Condensed */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[300px]">
                    {SECTORS.map((sector) => (
                        <button
                            key={sector}
                            onClick={() => setActiveSector(sector)}
                            className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                                activeSector === sector
                                    ? "bg-primary/20 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            {sector}
                        </button>
                    ))}
                </div>

                <div className="h-6 w-px bg-border mx-2" />

                {/* Actions */}
                <div className="flex items-center gap-1">
                    <div className="flex bg-muted/50 rounded-full p-0.5 border border-border">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn("p-2 rounded-full transition-all", viewMode === 'grid' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
                        >
                            <Grid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn("p-2 rounded-full transition-all", viewMode === 'list' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
                        >
                            <AlignLeft size={16} />
                        </button>
                    </div>

                    <button
                        onClick={() => setUploadMode(!uploadMode)}
                        className="ml-2 h-10 w-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg"
                    >
                        <Upload size={18} />
                    </button>
                </div>
            </FloatingPageDock>

            <AnimatePresence>
                {isViewerOpen && selectedDocument && (
                    <DocumentViewer
                        doc={selectedDocument}
                        onClose={closeViewer}
                        onDelete={() => deleteDocument(selectedDocument.id)}
                        logAction={logAction}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
